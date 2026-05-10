import mongoose from "mongoose";

const prayerRequestSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'workspace',
        default: null,
        index: true,
    },
    senderId: {
        type: String,
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 1000
    },
    visibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'private'
    },
    status: {
        type: String,
        enum: ['pending', 'prayed', 'archived'],
        default: 'pending'
    },
    // userIds who have personally prayed for this request. Independent of
    // `status` — `status` is the host/prayer-team's global state, this is each
    // member's "I lifted this up" tally.
    prayedBy: {
        type: [String],
        default: [],
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.models.prayerRequest || mongoose.model('prayerRequest', prayerRequestSchema);
