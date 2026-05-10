import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import roomModel from "@/lib/roomModel";
import waitingRoomModel from "@/lib/waitingRoomModel";

/**
 * Host decision on a waiting-room entry.
 *
 * POST { room_id, key, decision: 'admit' | 'deny', callerUserId }
 *
 * Authorization mirrors /api/livekit/moderate — caller must be the
 * room creator. The waiting guest is polling /api/v1/waiting-room and
 * will see the new status on its next tick.
 */
export async function POST(req) {
    try {
        const { room_id, key, decision, callerUserId } = await req.json();
        if (!room_id || !key || !decision || !callerUserId) {
            return NextResponse.json(
                { success: false, message: 'room_id, key, decision and callerUserId are required' },
                { status: 400 }
            );
        }
        if (decision !== 'admit' && decision !== 'deny') {
            return NextResponse.json(
                { success: false, message: "decision must be 'admit' or 'deny'" },
                { status: 400 }
            );
        }

        await connectDB();
        const room = await roomModel.findOne({ room_id }, { user_id: 1 }).lean();
        if (!room) {
            return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
        }
        if (room.user_id !== callerUserId) {
            return NextResponse.json({ success: false, message: 'Forbidden — host only' }, { status: 403 });
        }

        const nextStatus = decision === 'admit' ? 'admitted' : 'denied';
        const updated = await waitingRoomModel.findOneAndUpdate(
            { room_id, key, status: 'waiting' },
            { $set: { status: nextStatus, decidedAt: new Date() } },
            { new: true }
        );
        if (!updated) {
            return NextResponse.json(
                { success: false, message: 'Entry not found or already decided' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, status: nextStatus }, { status: 200 });
    } catch (error) {
        console.error('POST /api/v1/waiting-room/decision error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
