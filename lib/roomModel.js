import mongoose from "mongoose";


const roomSchema = new mongoose.Schema({
    user_id: {type: String},
    // Optional — populated when the room is created inside a Workspace.
    // Older rooms keep null and remain fully functional (backward compatible).
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'workspace', default: null, index: true },
    // Per-session mode. Drives which UI tools render in the call.
    // 'worship'  → Lyrics / Music Mode / Prayer / Give visible
    // 'business' → Whiteboard / Notes / Files (future) — worship buttons hidden
    // 'hybrid'   → both toolsets visible
    mode: { type: String, enum: ['worship', 'business', 'hybrid'], default: 'worship', index: true },
    room_id: {type: String,unique: true},
    start_time: {type: Date,default: new Date(Date.now())},
    user_plan: {type: String, default: "free"},
    end_time: {type: String,default: new Date(Date.now() + 1 * 60 * 60 * 1000)},
    isSchedule: {type: Boolean,default: false},
    description: {type: String,default: null},
    scheduleTime: {type: Date,default: null},
    // Set by /api/v1/notifications/check-upcoming once a "starts in 10 mins" notification has fired.
    // Prevents duplicate reminders if the cron double-runs.
    reminderSent: { type: Boolean, default: false },
    status:  {type: String,default: 'private',enum: ['public','private']},
    // Host policy for the waiting room. When true, knockers are auto-admitted
    // and the token route skips the admission check. Hosts can flip this from
    // inside the call (Waiting room panel) without leaving the meeting.
    allowAnyone: { type: Boolean, default: false },
    // --- Passcode protection (orthogonal to the waiting room) ---
    // When passcodeEnabled is true, callers must present the matching passcode
    // at the waiting-room knock step before they get an admission entry, and the
    // token route requires that admitted entry even if allowAnyone is on. The
    // host always bypasses. Combined with allowAnyone this yields four host
    // choices: passcode-only, knock-only, both, or open. Stored in plaintext so
    // the host can view/share it — never returned to non-hosts.
    passcodeEnabled: { type: Boolean, default: false },
    passcode: { type: String, default: null },
    // --- Idle / auto-end lifecycle ---
    // Bumped by /api/v1/meeting/activity whenever a participant is active
    // (media on, screenshare, chat, mouse/keyboard, join/leave). Stays null
    // until the first heartbeat so scheduled-but-not-started rooms aren't
    // mistaken for idle. The idle-sweep cron reads this to decide when to
    // warn / end a room.
    lastActivityAt: { type: Date, default: null, index: true },
    // Set once the idle warning has been pushed to the room; cleared on the
    // next activity heartbeat. Prevents the sweep from re-warning every minute.
    idleWarnedAt: { type: Date, default: null },
    // Set when the meeting closes (idle sweep, host end, or LiveKit teardown).
    // Excludes the room from future idle sweeps.
    endedAt: { type: Date, default: null },
    // 'idle' | 'closed' (LiveKit room gone) | future reasons. Diagnostic only.
    endedReason: { type: String, default: null },
    image: {
        url: {type: String,default: null,required: false},
        public_id: {type: String,default: null,required: false}
    }
})



export default mongoose.models.room ||  mongoose.model('room',roomSchema);