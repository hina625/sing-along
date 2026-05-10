import { NextResponse } from "next/server";
import cloudinary from "cloudinary";

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

        const buf = Buffer.from(await file.arrayBuffer());
        const mime = file.type || 'application/octet-stream';
        const resourceType = pickResourceType(mime);

        // Sanitize folder segment.
        const folderSafe = String(roomId).replace(/[^a-zA-Z0-9_-]/g, '');

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.v2.uploader.upload_stream(
                {
                    folder: `singalong_chat/${folderSafe}`,
                    resource_type: resourceType,
                    use_filename: true,
                    unique_filename: true,
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
