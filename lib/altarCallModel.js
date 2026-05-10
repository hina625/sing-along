import mongoose from "mongoose";

const responderSchema = new mongoose.Schema({
    userId:    { type: String, default: null },
    name:      { type: String, required: true, maxlength: 80 },
    note:      { type: String, default: '', maxlength: 300 },
    respondedAt: { type: Date, default: Date.now },
}, { _id: false });

const altarCallSchema = new mongoose.Schema({
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
    hostUserId: {
        type: String,
        required: true,
        index: true,
    },
    /**
     * Intent of the altar call. UI presets: salvation, rededication, healing,
     * prayer, baptism, custom. Free text allowed for non-preset intents.
     */
    type: {
        type: String,
        required: true,
        maxlength: 40,
    },
    /**
     * The host-customizable invitation shown to the congregation.
     * e.g. "Come forward to give your life to Christ."
     */
    prompt: {
        type: String,
        required: true,
        maxlength: 500,
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active',
        index: true,
    },
    responders: { type: [responderSchema], default: [] },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
});

altarCallSchema.index({ roomId: 1, status: 1 });
altarCallSchema.index({ hostUserId: 1, startedAt: -1 });

export default mongoose.models.altarCall || mongoose.model('altarCall', altarCallSchema);
