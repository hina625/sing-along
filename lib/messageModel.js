import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    roomId: { 
        type: String, 
        required: true, 
        index: true 
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
        // File-only messages can omit content — at least one of content or fileUrl must exist.
        default: '',
    },
    // Optional file attachment (uploaded via /api/v1/files/upload → Cloudinary).
    fileUrl:  { type: String, default: null },
    fileName: { type: String, default: null },
    fileType: { type: String, default: null }, // MIME type, e.g. 'image/png', 'application/pdf'
    fileSize: { type: Number, default: null }, // bytes
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Avoid re-compiling model if it exists
export default mongoose.models.message || mongoose.model('message', messageSchema);
