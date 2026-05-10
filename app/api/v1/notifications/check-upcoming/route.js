import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import roomModel from "@/lib/roomModel";
import { notify } from "@/lib/notify";

/**
 * Cron-friendly endpoint: fans out "starts in N mins" notifications.
 *
 * Suggested schedule: every 5 minutes via Vercel Cron, GitHub Actions,
 * or any cron-as-a-service. The endpoint is idempotent — once a room
 * gets its reminder it's marked, so duplicate runs don't re-notify.
 *
 * Auth: protect with `?secret=<env CRON_SECRET>` so randoms can't trigger
 * notifications. If CRON_SECRET is unset, the endpoint refuses to run.
 *
 *   POST or GET /api/v1/notifications/check-upcoming?secret=...&leadMinutes=10
 *
 * Returns: { sent, scanned }
 */
async function handle(req) {
    try {
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
            return NextResponse.json({
                success: false,
                message: 'CRON_SECRET env var is not set — refusing to run',
            }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret') || req.headers.get('x-cron-secret');
        if (secret !== cronSecret) {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const leadMinutes = Math.max(1, Math.min(parseInt(searchParams.get('leadMinutes') || '10', 10), 60));
        await connectDB();

        const now = new Date();
        const window = new Date(now.getTime() + leadMinutes * 60 * 1000);

        // Scheduled rooms whose start is within [now, now+lead], not already reminded.
        const upcoming = await roomModel.find({
            isSchedule: true,
            reminderSent: { $ne: true },
            scheduleTime: { $gte: now, $lte: window },
        }).lean();

        let sent = 0;
        for (const r of upcoming) {
            const minsAway = Math.max(1, Math.round((new Date(r.scheduleTime).getTime() - now.getTime()) / 60000));
            const isWorship = (r.mode || 'worship') === 'worship';
            try {
                await notify({
                    userId: r.user_id,
                    type: isWorship ? 'worship.starting' : 'system',
                    title: isWorship
                        ? `🎶 Worship starts in ${minsAway} min${minsAway === 1 ? '' : 's'}`
                        : `💼 Meeting starts in ${minsAway} min${minsAway === 1 ? '' : 's'}`,
                    body: r.description || null,
                    link: `/dashboard/beforemeet/${r.room_id}`,
                    icon: isWorship ? '🎶' : '💼',
                });
                await roomModel.updateOne({ _id: r._id }, { reminderSent: true });
                sent += 1;
            } catch (e) {
                console.error('check-upcoming notify failed for room', r.room_id, e?.message);
            }
        }

        return NextResponse.json({
            success: true,
            scanned: upcoming.length,
            sent,
            leadMinutes,
        }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/notifications/check-upcoming error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export const GET = handle;
export const POST = handle;
