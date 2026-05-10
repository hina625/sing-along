import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import roomModel from "@/lib/roomModel";
import { notify } from "@/lib/notify";

/**
 * Lightweight "knock" for guests joining a worship.
 *
 * POST { room_id, guestName }
 *
 * Notifies the host that someone has joined. Today there is no admission
 * gating — the guest enters immediately. The host can still remove via the
 * existing People-panel moderation. A future iteration can add a real
 * waiting-room (host approval before LiveKit token is issued).
 */
export async function POST(req) {
    try {
        const { room_id, guestName } = await req.json();
        if (!room_id || !guestName) {
            return NextResponse.json({ success: false, message: 'room_id and guestName are required' }, { status: 400 });
        }
        await connectDB();
        const room = await roomModel.findOne({ room_id }, { user_id: 1 }).lean();
        if (!room?.user_id) {
            return NextResponse.json({ success: true, ignored: 'room not found' }, { status: 200 });
        }
        await notify({
            userId: room.user_id,
            type: 'meeting.invite',
            title: '👋 Guest joined worship',
            body: `${guestName} has joined the live service.`,
            link: `/meeting/${room_id}`,
            icon: '👋',
        });
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('POST /api/v1/guest-join error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
