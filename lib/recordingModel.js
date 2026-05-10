import mongoose from "mongoose";

const recordingSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true,
    },
    hostUserId: {
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
    title: {
        type: String,
        default: null,
    },
    egressId: {
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: String,
        enum: ['starting', 'recording', 'completed', 'failed', 'aborted'],
        default: 'starting',
        index: true,
    },
    fileUrl: {
        type: String,
        default: null,
    },
    durationSec: {
        type: Number,
        default: null,
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    endedAt: {
        type: Date,
        default: null,
    },
});

export default mongoose.models.recording || mongoose.model('recording', recordingSchema);
