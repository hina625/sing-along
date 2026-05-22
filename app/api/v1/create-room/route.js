const { NextResponse } = require("next/server")
import connectDB from '@/lib/connnectDB'
import roomModel from '@/lib/roomModel';
import workspaceModel from '@/lib/workspaceModel';
import { canStartMeeting, computePlanEndTime } from '@/lib/planLimits';
import { requirePermission } from '@/lib/permissions';
import cloudinary from 'cloudinary';

const VALID_MODES = ['worship', 'business', 'hybrid'];

// Map a workspace mode to a sensible default room mode.
// Workspace 'community' falls back to 'hybrid' so room shows both toolsets.
function deriveModeFromWorkspace(wsMode) {
    if (wsMode === 'business') return 'business';
    if (wsMode === 'community' || wsMode === 'hybrid') return 'hybrid';
    return 'worship';
}

const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
}
cloudinary.config(cloudinaryConfig);

export const POST = async (req) => {
    try {
        await connectDB()
        const { user_id, workspaceId, mode, room_id, start_time, user_plan, end_time: requestedEndTime, isSchedule, description, scheduleTime, status, image, passcodeEnabled, passcode } = await req.json();
        let end_time = requestedEndTime;

        // Idempotency: if a room with this room_id already exists, return it
        // without re-running the plan-cap check or creating a duplicate. This
        // covers flows like personal-room that lazily seed the row from
        // multiple call sites (Start Meeting + Send Invites).
        if (room_id) {
            const existing = await roomModel.findOne({ room_id });
            if (existing) {
                // Don't echo the passcode back on this idempotent path — callers
                // here aren't necessarily the host.
                const safe = existing.toObject();
                delete safe.passcode;
                return NextResponse.json(
                    { success: true, message: 'Room already exists', room: safe, alreadyExists: true },
                    { status: 200 }
                );
            }
        }

        // Creating a room is a "manage meetings" action when scoped to a workspace.
        // Personal-room flows without a workspaceId aren't gated here.
        if (workspaceId && user_id) {
            const denied = await requirePermission({
                workspaceId, userId: user_id, resource: 'meetings', action: 'manage',
            });
            if (denied) return denied;
        }

        // Plan gate: daily meeting cap + active subscription check.
        // Skipped for scheduled rooms — those don't count against today's quota
        // (the count fires when they actually start).
        if (!isSchedule) {
            const guard = await canStartMeeting(user_id);
            if (!guard.allowed) {
                return NextResponse.json({ success: false, message: guard.reason }, { status: 402 });
            }
            // Clamp end_time so a client can't request more than the plan allows.
            const planEnd = computePlanEndTime(guard.plan, new Date()).toUTCString();
            // If client supplied an end_time later than the cap, override it.
            const requested = end_time ? new Date(end_time).getTime() : 0;
            const cap = new Date(planEnd).getTime();
            if (!end_time || requested > cap) {
                end_time = planEnd;
            }
        }

        // Resolve a final mode: explicit param > workspace default > 'worship'.
        let finalMode = VALID_MODES.includes(mode) ? mode : null;
        if (!finalMode && workspaceId) {
            try {
                const ws = await workspaceModel.findById(workspaceId, { mode: 1 }).lean();
                if (ws?.mode) finalMode = deriveModeFromWorkspace(ws.mode);
            } catch (e) {
                console.error('mode derivation lookup failed:', e?.message);
            }
        }
        if (!finalMode) finalMode = 'worship';

        let imageUrl = null;
        let imagePublicId = null;
        if (image) {
            const result = await cloudinary.uploader.upload(image, { folder: 'hgsingalong_meetings' });
            imageUrl = result.secure_url;
            imagePublicId = result.public_id;
        }

        // Optional passcode protection set at creation. Only persist a code when
        // protection is explicitly enabled with a non-empty value.
        const wantsPasscode = passcodeEnabled === true && !!(passcode ?? '').toString().trim();

        const room = await roomModel.create({
            user_id,
            workspaceId: workspaceId || null,
            mode: finalMode,
            room_id,
            start_time,
            user_plan,
            end_time,
            isSchedule,
            description,
            scheduleTime,
            status,
            passcodeEnabled: wantsPasscode,
            passcode: wantsPasscode ? passcode.toString().trim() : null,
            image: { url: imageUrl, public_id: imagePublicId },
        });

        return NextResponse.json({ success: true, message: "Room Create Successfully", room }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

}


export const GET = async (req) => {
    try {
        await connectDB()
        const query = new URLSearchParams(req.url.split('?')[1]);
        const room_id = query.get('room_id');
        // Exclude the passcode — this endpoint is read by every visitor on the
        // join page. passcodeEnabled is fine to expose (drives the UI prompt).
        const room = await roomModel.findOne({ room_id }, { passcode: 0 })

        return NextResponse.json({ success: true, room }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

}


export const PUT = async (req) => {
    try {
        await connectDB()
        const query = new URLSearchParams(req.url.split('?')[1]);
        const room_id = query.get('room_id');
        const { start_time, end_time } = await req.json();

        const room = await roomModel.findOneAndUpdate({ room_id }, { start_time, end_time, isSchedule: false });


        return NextResponse.json({ success: true, room }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

}
