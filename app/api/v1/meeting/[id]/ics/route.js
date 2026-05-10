import connectDB from '@/lib/connnectDB';
import roomModel from '@/lib/roomModel';
import { icsContent } from '@/lib/calendar';

/**
 * GET /api/v1/meeting/{id}/ics
 *
 * Returns a downloadable .ics file for the room's scheduled time so the host
 * (or any invitee) can drop it straight into Apple Calendar / Outlook desktop /
 * any RFC 5545-compliant client. Web Google/Outlook/Yahoo users have one-click
 * deep links elsewhere; this is for the desktop / mobile-app calendar case.
 */
export async function GET(req, { params }) {
    try {
        await connectDB();
        const { id } = params || {};
        if (!id) return new Response('room id required', { status: 400 });

        const room = await roomModel.findOne({ room_id: id }).lean();
        if (!room) return new Response('room not found', { status: 404 });

        // Resolve start/end:
        // - If scheduled, use scheduleTime as the start; pick a 1-hour default end if no end_time.
        // - Otherwise, use start_time / end_time.
        const start = room.scheduleTime || room.start_time;
        let end = room.end_time;
        if (!end) {
            end = new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
        }

        // Compose the meeting URL — falls back to relative path if the env isn't set.
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const meetingUrl = `${base.replace(/\/$/, '')}/meeting/${id}`;

        const isWorship = (room.mode || 'worship') === 'worship';
        const title = room.description || (isWorship ? 'Singalong Worship Service' : 'Singalong Meeting');
        const description = `Join here: ${meetingUrl}${room.description ? `\n\n${room.description}` : ''}`;

        const ics = icsContent({
            title,
            description,
            location: meetingUrl,
            startISO: new Date(start).toISOString(),
            endISO: new Date(end).toISOString(),
        }, `${id}@singalong`);

        return new Response(ics, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `attachment; filename="singalong-${id}.ics"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('GET /api/v1/meeting/[id]/ics error:', error);
        return new Response(error?.message || 'failed', { status: 500 });
    }
}
