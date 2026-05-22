import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import roomModel from "@/lib/roomModel";

/**
 * Meeting passcode policy (orthogonal to the waiting room — see roomModel).
 *
 * GET  ?room_id=                          → { success, passcodeEnabled }
 *   Public-safe: tells a joining client whether to prompt for a passcode.
 *   Never returns the passcode value to non-hosts.
 *
 * GET  ?room_id=&user_id=<host clerk id>  → { success, passcodeEnabled, passcode }
 *   Host only — includes the value so the host can view/share it. Falls back to
 *   the public-safe shape if user_id isn't the room creator.
 *
 * POST { room_id, callerUserId, passcodeEnabled, passcode? }
 *   Host only. Enables/disables protection and sets the code. Disabling clears
 *   the stored passcode. Authorization mirrors waiting-room/policy.
 */

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const room_id = searchParams.get('room_id');
        const user_id = searchParams.get('user_id');
        if (!room_id) {
            return NextResponse.json({ success: false, message: 'room_id is required' }, { status: 400 });
        }
        await connectDB();
        const room = await roomModel
            .findOne({ room_id }, { user_id: 1, passcodeEnabled: 1, passcode: 1 })
            .lean();
        if (!room) {
            return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
        }
        const passcodeEnabled = !!room.passcodeEnabled;
        const isHost = !!(user_id && room.user_id && user_id === room.user_id);
        return NextResponse.json(
            isHost
                ? { success: true, passcodeEnabled, passcode: room.passcode || '' }
                : { success: true, passcodeEnabled },
            { status: 200 }
        );
    } catch (error) {
        console.error('GET /api/v1/meeting/passcode error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { room_id, callerUserId, passcodeEnabled, passcode } = await req.json();
        if (!room_id || !callerUserId || typeof passcodeEnabled !== 'boolean') {
            return NextResponse.json(
                { success: false, message: 'room_id, callerUserId and passcodeEnabled (boolean) are required' },
                { status: 400 }
            );
        }

        // When enabling, a non-empty passcode is mandatory.
        const code = (passcode ?? '').toString().trim();
        if (passcodeEnabled && !code) {
            return NextResponse.json(
                { success: false, message: 'A passcode is required when protection is enabled.' },
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

        await roomModel.updateOne(
            { room_id },
            { $set: { passcodeEnabled, passcode: passcodeEnabled ? code : null } }
        );

        return NextResponse.json(
            { success: true, passcodeEnabled, passcode: passcodeEnabled ? code : '' },
            { status: 200 }
        );
    } catch (error) {
        console.error('POST /api/v1/meeting/passcode error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
