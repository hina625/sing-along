import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import connectDB from "@/lib/connnectDB";
import songModel from "@/lib/songModel";
import workspaceModel from "@/lib/workspaceModel";
import { requirePermission } from "@/lib/permissions";
import { resolveUserPlan, canUpload } from "@/lib/planLimits";

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — songs run larger than chat files

/**
 * GET /api/v1/songs?workspace_id=...
 *   Lists the workspace's song library (newest first).
 *
 * POST  multipart: file=<File>, workspace_id, uploaderUserId, title, artist?
 *   Uploads a song to Cloudinary under singalong_songs/<workspaceId>/.
 *   Admin or host of the workspace only.
 *
 * DELETE { id, callerUserId }
 *   Removes a song (admin/host only). Best-effort Cloudinary destroy.
 */

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspace_id');
        const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);
        if (!workspaceId) {
            return NextResponse.json({ success: false, message: 'workspace_id is required' }, { status: 400 });
        }
        const songs = await songModel
            .find({ workspaceId })
            .sort({ uploadedAt: -1 })
            .limit(limit)
            .lean();
        return NextResponse.json({ success: true, songs }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/songs error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const form = await req.formData();
        const file = form.get('file');
        const workspaceId = form.get('workspace_id');
        const uploaderUserId = form.get('uploaderUserId');
        const title = (form.get('title') || '').toString().trim();
        const artist = (form.get('artist') || '').toString().trim();
        const durationSec = form.get('durationSec') ? Number(form.get('durationSec')) : null;

        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, message: 'file is required' }, { status: 400 });
        }
        if (!workspaceId || !uploaderUserId || !title) {
            return NextResponse.json({ success: false, message: 'workspace_id, uploaderUserId, title required' }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ success: false, message: 'File exceeds 50 MB limit' }, { status: 413 });
        }

        await connectDB();
        const denied = await requirePermission({
            workspaceId, userId: uploaderUserId, resource: 'songs', action: 'manage',
        });
        if (denied) return denied;

        // Plan gates are billed against the WORKSPACE OWNER (the entity paying),
        // not the uploader. A Pro admin invited into a Free workspace must not
        // be able to upload songs (Free has no media library); conversely a
        // Free user invited into a Pro workspace SHOULD be able to upload.
        const ws = await workspaceModel.findById(workspaceId, { ownerUserId: 1 }).lean();
        if (!ws) {
            return NextResponse.json({ success: false, message: 'Workspace not found' }, { status: 404 });
        }
        const ownerPlan = await resolveUserPlan(ws.ownerUserId);
        if (!ownerPlan.mediaLibrary) {
            return NextResponse.json(
                { success: false, message: `The Media Library is available on Professional and above. This workspace is on the ${ownerPlan.title} plan.`, code: 'plan_media_library' },
                { status: 402 }
            );
        }

        // Storage cap — billed to the owner so teammate uploads count.
        const storageGuard = await canUpload(ws.ownerUserId, file.size);
        if (!storageGuard.allowed) {
            return NextResponse.json(
                { success: false, message: storageGuard.reason, code: 'plan_storage_full' },
                { status: 402 }
            );
        }

        const buf = Buffer.from(await file.arrayBuffer());
        const mime = file.type || 'audio/mpeg';
        const folderSafe = String(workspaceId).replace(/[^a-zA-Z0-9_-]/g, '');

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.v2.uploader.upload_stream(
                {
                    folder: `singalong_songs/${folderSafe}`,
                    resource_type: 'video', // Cloudinary uses 'video' bucket for audio too
                    use_filename: true,
                    unique_filename: true,
                    overwrite: false,
                },
                (err, result) => (err ? reject(err) : resolve(result))
            );
            stream.end(buf);
        });

        const created = await songModel.create({
            workspaceId,
            uploaderUserId,
            title: title.slice(0, 200),
            artist: artist.slice(0, 200),
            fileUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            // Cloudinary returns duration on the upload result for audio/video.
            durationSec: Number.isFinite(uploadResult.duration) ? uploadResult.duration : durationSec,
            fileSize: uploadResult.bytes,
            mimeType: mime,
        });

        return NextResponse.json({ success: true, song: created }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/songs error:', error);
        return NextResponse.json({ success: false, message: error?.message || 'upload failed' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await connectDB();
        const { id, callerUserId } = await req.json();
        if (!id || !callerUserId) {
            return NextResponse.json({ success: false, message: 'id and callerUserId required' }, { status: 400 });
        }
        const song = await songModel.findById(id).lean();
        if (!song) return NextResponse.json({ success: false, message: 'Song not found' }, { status: 404 });
        const denied = await requirePermission({
            workspaceId: song.workspaceId, userId: callerUserId, resource: 'songs', action: 'manage',
        });
        if (denied) return denied;
        // Best-effort Cloudinary destroy — don't fail the API if it errors.
        if (song.publicId) {
            try {
                await cloudinary.v2.uploader.destroy(song.publicId, { resource_type: 'video' });
            } catch (e) {
                console.error('Cloudinary destroy failed (non-fatal):', e?.message);
            }
        }
        await songModel.findByIdAndDelete(id);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('DELETE /api/v1/songs error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
