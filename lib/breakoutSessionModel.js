import mongoose from "mongoose";

/**
 * Breakout session = a host-initiated split of the main worship/meeting into
 * smaller LiveKit rooms ("groups") for prayer, discussion, or huddles.
 *
 * Each group's roomId is derived deterministically: `<parentRoomId>-bo-<index>`
 * so participants land in the same shared room when they pick the same group.
 */
const groupSchema = new mongoose.Schema({
    index: { type: Number, required: true }, // 1..N
    name:  { type: String, required: true, maxlength: 60 },
    roomId: { type: String, required: true }, // child LiveKit room id
}, { _id: false });

const breakoutSessionSchema = new mongoose.Schema({
    parentRoomId: {
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
    hostUserId: {
        type: String,
        required: true,
        index: true,
    },
    groups: { type: [groupSchema], default: [] },
    // Host-controlled assignment: userId → groupIndex (1..N).
    // Absent / 0 means "let them pick" (or "in the parent room").
    assignments: {
        type: Map,
        of: Number,
        default: () => new Map(),
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active',
        index: true,
    },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
});

breakoutSessionSchema.index({ parentRoomId: 1, status: 1 });

export default mongoose.models.breakoutSession || mongoose.model('breakoutSession', breakoutSessionSchema);
