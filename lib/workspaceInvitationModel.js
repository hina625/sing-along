import mongoose from "mongoose";

const workspaceInvitationSchema = new mongoose.Schema({
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'workspace',
        required: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    role: {
        type: String,
        enum: ['admin', 'host', 'cohost', 'member', 'guest'],
        default: 'member',
    },
    token: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    invitedByUserId: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'revoked', 'expired'],
        default: 'pending',
        index: true,
    },
    acceptedByUserId: {
        type: String,
        default: null,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Only one pending invite per (workspace, email).
workspaceInvitationSchema.index(
    { workspaceId: 1, email: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.models.workspaceInvitation
    || mongoose.model('workspaceInvitation', workspaceInvitationSchema);
