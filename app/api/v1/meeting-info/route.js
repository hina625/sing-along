import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import roomModel from "@/lib/roomModel";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Public meeting metadata for the guest/join landing page.
 * GET ?room_id=...
 *
 * Returns: { exists, title, hostFirstName, scheduleTime, isScheduledForFuture, hasEnded, status }
 *
 * Intentionally does not leak host user_id, email, or full name.
 */
export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get('room_id');
        if (!roomId) {
            return NextResponse.json({ success: false, message: 'room_id is required' }, { status: 400 });
        }

        const room = await roomModel.findOne({ room_id: roomId }).lean();
        if (!room) {
            return NextResponse.json({ success: true, exists: false }, { status: 200 });
        }

        // Resolve host's first name (best-effort; Clerk sometimes throws if user is deleted).
        let hostFirstName = null;
        try {
            const host = await clerkClient.users.getUser(room.user_id);
            hostFirstName = host?.firstName || null;
        } catch {
            /* ignore */
        }

        // Status derivation.
        const now = new Date();
        const start = room.start_time ? new Date(room.start_time) : null;
        const end = room.end_time ? new Date(room.end_time) : null;
        const scheduleTime = room.scheduleTime ? new Date(room.scheduleTime) : null;

        const isScheduledForFuture = !!(room.isSchedule && scheduleTime && scheduleTime > now);
        const hasEnded = !!(end && !isNaN(end.getTime()) && end < now);
        const isLive = !isScheduledForFuture && !hasEnded;

        return NextResponse.json({
            success: true,
            exists: true,
            title: room.description || null,
            hostFirstName,
            scheduleTime: scheduleTime ? scheduleTime.toISOString() : null,
            startTime: start ? start.toISOString() : null,
            endTime: end ? end.toISOString() : null,
            isScheduledForFuture,
            hasEnded,
            isLive,
            visibility: room.status, // 'public' | 'private'
            mode: room.mode || 'worship',
        }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/meeting-info error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
