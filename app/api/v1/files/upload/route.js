import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import connectDB from "@/lib/connnectDB";
import roomModel from "@/lib/roomModel";
import workspaceModel from "@/lib/workspaceModel";
import { canUpload } from "@/lib/planLimits";

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

// Cloudinary's three resource_type buckets — pick by MIME prefix.
function pickResourceType(mime) {
    if (!mime) return 'auto';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'video';
    return 'raw'; // PDFs, docs, zips, etc.
}

/**
 * POST /api/v1/files/upload
 *   multipart/form-data: file=<File>, roomId=<string>
 *
 * Uploads to Cloudinary under `singalong_chat/<roomId>/`. Returns secure_url +
 * metadata so the client can include them in the chat POST.
 */
export async function POST(req) {
    try {
        const form = await req.formData();
        const file = form.get('file');
        const roomId = form.get('roomId');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, message: 'file is required' }, { status: 400 });
        }
        if (!roomId) {
            return NextResponse.json({ success: false, message: 'roomId is required' }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ success: false, message: 'File exceeds 25 MB limit' }, { status: 413 });
        }

        // Storage cap is billed to the billing entity for this room:
        //   • room with workspaceId → workspace OWNER (so a teammate's upload
        //     counts against the owner's quota, matching invoicing)
        //   • personal room (no workspaceId) → room host (user_id)
        // Guest uploads still attribute correctly because we don't trust the
        // caller's identity — we always resolve through the room.
        await connectDB();
        const room = await roomModel.findOne({ room_id: roomId }, { user_id: 1, workspaceId: 1 }).lean();
        if (!room) {
            return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
        }
        let billingUserId = room.user_id;
        if (room.workspaceId) {
            const ws = await workspaceModel.findById(room.workspaceId, { ownerUserId: 1 }).lean();
            if (ws?.ownerUserId) billingUserId = ws.ownerUserId;
        }
        const storageGuard = await canUpload(billingUserId, file.size);
        if (!storageGuard.allowed) {
            return NextResponse.json(
                { success: false, message: storageGuard.reason, code: 'plan_storage_full' },
                { status: 402 }
            );
        }

        const buf = Buffer.from(await file.arrayBuffer());
        const mime = file.type || 'application/octet-stream';
        const resourceType = pickResourceType(mime);

        // Sanitize folder segment.
        const folderSafe = String(roomId).replace(/[^a-zA-Z0-9_-]/g, '');

        // upload_stream gets a raw buffer with no filename, so `use_filename`
        // has nothing to read. Build a sanitized public_id ourselves; for
        // `raw` resources we keep the extension in the id so the delivery URL
        // ends in e.g. `.docx` (browsers download cross-origin URLs using the
        // URL tail — the <a download> attribute is ignored on cross-origin).
        const original = String(file.name || 'file');
        const lastDot = original.lastIndexOf('.');
        const base = (lastDot > 0 ? original.slice(0, lastDot) : original)
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 80) || 'file';
        const ext = lastDot > 0 ? original.slice(lastDot + 1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
        const rand = Math.random().toString(36).slice(2, 8);
        const publicIdBase = `${base}_${rand}`;
        // For raw, the public_id IS the storage key — include extension so the
        // delivered URL preserves the file type. For image/video, Cloudinary
        // appends the format to the URL automatically; don't double it.
        const publicId = resourceType === 'raw' && ext ? `${publicIdBase}.${ext}` : publicIdBase;

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.v2.uploader.upload_stream(
                {
                    folder: `singalong_chat/${folderSafe}`,
                    resource_type: resourceType,
                    public_id: publicId,
                    filename_override: original,
                    overwrite: false,
                },
                (err, result) => (err ? reject(err) : resolve(result))
            );
            stream.end(buf);
        });

        return NextResponse.json({
            success: true,
            file: {
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id,
                resourceType: uploadResult.resource_type,
                bytes: uploadResult.bytes,
                fileName: file.name || uploadResult.original_filename,
                fileType: mime,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/files/upload error:', error);
        return NextResponse.json({ success: false, message: error?.message || 'upload failed' }, { status: 500 });
    }
}

// App Router uses req.formData() directly; no bodyParser config needed.
// Server-action body limit is configured via next.config (experimental.serverActions.bodySizeLimit)
// but route handlers stream the body so the 25 MB cap is enforced inline above.
