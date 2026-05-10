import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import roomModel from "@/lib/roomModel";

/**
 * GET /api/v1/room-role?room_id=...&user_id=...
 *
 * Resolves the caller's role for a given room.
 * Roles (Phase 2 — minimal): 'host' (room creator) | 'member' (logged in, not creator) | 'guest' (no user_id).
 * Co-host promotion lands in a follow-up.
 */
export const GET = async (req) => {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const room_id = searchParams.get('room_id');
        const user_id = searchParams.get('user_id');

        if (!room_id) {
            return NextResponse.json({ success: false, message: "room_id is required" }, { status: 400 });
        }

        const room = await roomModel.findOne({ room_id });
        if (!room) {
            return NextResponse.json({ success: false, message: "Room not found" }, { status: 404 });
        }

        let role = 'guest';
        if (user_id) {
            role = room.user_id === user_id ? 'host' : 'member';
        }

        return NextResponse.json({
            success: true,
            role,
            isHost: role === 'host',
            roomCreatorId: room.user_id,
            mode: room.mode || 'worship',
            workspaceId: room.workspaceId || null,
        }, { status: 200 });
    } catch (error) {
        console.error("GET /api/v1/room-role error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
};
