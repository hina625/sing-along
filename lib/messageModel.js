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
        required: true 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
});

// Avoid re-compiling model if it exists
export default mongoose.models.message || mongoose.model('message', messageSchema);
