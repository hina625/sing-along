import mongoose from "mongoose";

const aiChatSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: String,
        default: null,
        index: true,
    },
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
});

aiChatSchema.index({ sessionId: 1, timestamp: 1 });

export default mongoose.models.aichat || mongoose.model("aichat", aiChatSchema);
