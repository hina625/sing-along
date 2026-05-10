import mongoose from "mongoose";

/**
 * One row per "knock". Created by /api/v1/waiting-room (POST), advanced
 * to admitted/denied by /api/v1/waiting-room/decision (POST). The token
 * route reads `status === 'admitted'` before issuing a LiveKit JWT.
 *
 * `expiresAt` + a TTL index garbage-collects abandoned entries so the
 * collection doesn't grow unbounded — guests who close the tab simply
 * vanish after the window.
 */
const waitingRoomSchema = new mongoose.Schema({
    room_id:     { type: String, required: true, index: true },
    key:         { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    userId:      { type: String, default: null },
    status:      { type: String, enum: ['waiting', 'admitted', 'denied'], default: 'waiting', index: true },
    createdAt:   { type: Date, default: Date.now },
    decidedAt:   { type: Date, default: null },
    expiresAt:   { type: Date, default: () => new Date(Date.now() + 60 * 60 * 1000) },
});

waitingRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.waitingRoom || mongoose.model('waitingRoom', waitingRoomSchema);
