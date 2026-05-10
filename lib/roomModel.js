import mongoose from "mongoose";
import { type } from "os";


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
    image: {
        url: {type: String,default: null,required: false},
        public_id: {type: String,default: null,required: false}
    }
})



export default mongoose.models.room ||  mongoose.model('room',roomSchema);