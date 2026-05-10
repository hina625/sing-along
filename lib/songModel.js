import mongoose from "mongoose";

/**
 * Workspace-scoped library of audio files (worship songs, backing tracks,
 * sermon-bumper music). Hosts pick from this list during a live service via
 * the in-call Music Player; admins upload + manage from /dashboard/songs.
 */
const songSchema = new mongoose.Schema({
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'workspace',
        required: true,
        index: true,
    },
    uploaderUserId: {
        type: String,
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        maxlength: 200,
        trim: true,
    },
    artist: {
        type: String,
        default: '',
        maxlength: 200,
        trim: true,
    },
    fileUrl: {
        type: String,
        required: true,
    },
    publicId: {
        type: String,
        default: null, // Cloudinary public_id for deletion
    },
    durationSec: {
        type: Number,
        default: null,
    },
    fileSize: {
        type: Number,
        default: null,
    },
    mimeType: {
        type: String,
        default: null,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
});

songSchema.index({ workspaceId: 1, uploadedAt: -1 });

export default mongoose.models.song || mongoose.model('song', songSchema);
