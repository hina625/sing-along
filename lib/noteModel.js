import mongoose from "mongoose";

/**
 * Per-meeting shared notes log.
 * Multiple authors append timestamped entries; the meeting builds up a running
 * minute-style log that survives after the call ends.
 *
 * Pinned entries float to the top of the panel (host action).
 */
const noteSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true,
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'workspace',
        default: null,
        index: true,
    },
    authorUserId: {
        type: String,
        default: null,
    },
    authorName: {
        type: String,
        required: true,
        maxlength: 80,
    },
    content: {
        type: String,
        required: true,
        maxlength: 4000,
    },
    pinned: {
        type: Boolean,
        default: false,
        index: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
});

noteSchema.index({ roomId: 1, pinned: -1, timestamp: 1 });

export default mongoose.models.note || mongoose.model('note', noteSchema);
