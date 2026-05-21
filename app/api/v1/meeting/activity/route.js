import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import roomModel from "@/lib/roomModel";
import { resolveUserPlan, getIdlePolicy } from "@/lib/planLimits";

/**
 * Meeting activity heartbeat + idle policy.
 *
 * GET  ?room=<room_id>
 *   → { success, policy: { warnMin, endMin }, lastActivityAt, endedAt }
 *   Clients fetch this once on join to know when to surface the local
 *   "inactive — closing soon" warning.
 *
 * POST { room, userId? }
 *   → { success }
 *   Lightweight bump of room.lastActivityAt (and clears idleWarnedAt) so the
 *   idle-sweep cron knows the room is still alive. Sent by the in-call client
 *   whenever it observes activity (media, screenshare, chat, mouse/keyboard,
 *   participants joining/leaving), throttled client-side to ~once per window.
 *
 * Intentionally cheap and unauthenticated beyond "the room exists" — keeping a
 * meeting alive is benign, and gating it per-participant would add a DB role
 * lookup to every heartbeat. The destructive side (ending rooms) lives in the
 * CRON_SECRET-protected sweep, not here.
 */

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const room = searchParams.get('room');
        if (!room) {
            return NextResponse.json({ success: false, message: 'room is required' }, { status: 400 });
        }
        const doc = await roomModel.findOne({ room_id: room }).lean();
        if (!doc) {
            return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
        }
        const plan = await resolveUserPlan(doc.user_id);
        const policy = getIdlePolicy(plan);
        return NextResponse.json({
            success: true,
            policy,
            lastActivityAt: doc.lastActivityAt || null,
            endedAt: doc.endedAt || null,
        }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/meeting/activity error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const body = await req.json().catch(() => ({}));
        const room = body?.room;
        if (!room) {
            return NextResponse.json({ success: false, message: 'room is required' }, { status: 400 });
        }
        // Single indexed update — no plan lookup on the hot path. Don't revive a
        // room that has already ended.
        const updated = await roomModel.findOneAndUpdate(
            { room_id: room, endedAt: null },
            { lastActivityAt: new Date(), idleWarnedAt: null },
            { new: true, projection: { _id: 1 } }
        );
        if (!updated) {
            return NextResponse.json({ success: false, message: 'Room not found or already ended' }, { status: 404 });
        }
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('POST /api/v1/meeting/activity error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
