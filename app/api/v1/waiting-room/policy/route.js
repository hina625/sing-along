import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import roomModel from "@/lib/roomModel";
import waitingRoomModel from "@/lib/waitingRoomModel";

/**
 * Host policy for the waiting room.
 *
 * GET  ?room_id=                                          → { allowAnyone }
 * POST { room_id, allowAnyone, callerUserId }
 *   Toggles auto-admission. When allowAnyone=true, any pending entries are
 *   bulk-admitted in the same transaction so the people already knocking
 *   don't keep waiting.
 *
 * Authorization mirrors /api/v1/waiting-room/decision — caller must be the
 * room creator.
 */

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const room_id = searchParams.get('room_id');
        if (!room_id) {
            return NextResponse.json({ success: false, message: 'room_id is required' }, { status: 400 });
        }
        await connectDB();
        const room = await roomModel.findOne({ room_id }, { allowAnyone: 1 }).lean();
        if (!room) {
            return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, allowAnyone: !!room.allowAnyone }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/waiting-room/policy error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { room_id, allowAnyone, callerUserId } = await req.json();
        if (!room_id || typeof allowAnyone !== 'boolean' || !callerUserId) {
            return NextResponse.json(
                { success: false, message: 'room_id, allowAnyone (boolean) and callerUserId are required' },
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

        await roomModel.updateOne({ room_id }, { $set: { allowAnyone } });

        // Flush anyone already waiting so they don't have to re-knock when the
        // host opens the gate.
        if (allowAnyone) {
            await waitingRoomModel.updateMany(
                { room_id, status: 'waiting' },
                { $set: { status: 'admitted', decidedAt: new Date() } }
            );
        }

        return NextResponse.json({ success: true, allowAnyone }, { status: 200 });
    } catch (error) {
        console.error('POST /api/v1/waiting-room/policy error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
