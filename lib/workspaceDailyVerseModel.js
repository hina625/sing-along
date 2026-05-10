import mongoose from "mongoose";

/**
 * Workspace-owned daily verse pool. When a workspace has at least one entry,
 * /api/v1/bible/daily-verse rotates within that pool instead of the global one.
 */
const workspaceDailyVerseSchema = new mongoose.Schema({
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'workspace',
        required: true,
        index: true,
    },
    reference: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
    },
    note: {
        type: String,
        default: null,
        maxlength: 240,
    },
    addedByUserId: {
        type: String,
        required: true,
    },
    position: {
        type: Number,
        default: 0,
        index: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

workspaceDailyVerseSchema.index({ workspaceId: 1, position: 1, createdAt: 1 });

export default mongoose.models.workspaceDailyVerse
    || mongoose.model('workspaceDailyVerse', workspaceDailyVerseSchema);
