import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: [
            'worship.live',
            'worship.starting',
            'prayer.new',
            'recording.ready',
            'recording.failed',
            'donation.received',
            'meeting.invite',
            'system',
        ],
        required: true,
    },
    title: {
        type: String,
        required: true,
        maxlength: 140,
    },
    body: {
        type: String,
        default: '',
        maxlength: 500,
    },
    link: {
        type: String,
        default: null,
    },
    icon: {
        type: String,
        default: null, // optional emoji or short token
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
});

notificationSchema.index({ userId: 1, isRead: 1, timestamp: -1 });

export default mongoose.models.notification || mongoose.model('notification', notificationSchema);
