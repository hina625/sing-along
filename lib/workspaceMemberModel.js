import mongoose from "mongoose";

const workspaceMemberSchema = new mongoose.Schema({
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'workspace',
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: ['admin', 'host', 'cohost', 'member', 'guest'],
        default: 'member',
        index: true,
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
});

// One membership per (workspace, user).
workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export default mongoose.models.workspaceMember || mongoose.model('workspaceMember', workspaceMemberSchema);
