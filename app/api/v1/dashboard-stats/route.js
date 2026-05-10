import { NextResponse } from 'next/server';
import connectDB from '@/lib/connnectDB';
import roomModel from '@/lib/roomModel';
import recordingModel from '@/lib/recordingModel';
import prayerRequestModel from '@/lib/prayerRequestModel';
import donationModel from '@/lib/donationModel';

/**
 * Dashboard analytics aggregator.
 * GET /api/v1/dashboard-stats?host_user_id=...&days=30
 *
 * Returns:
 *   totals:          { sessions, recordings, prayers, donationsCount, donationsAmount }
 *   live:            { count }                          // sessions currently in window
 *   upcoming:        { count, next: { ...room } | null }
 *   prayerBreakdown: { pending, prayed, archived }
 *   sessionsSeries:  [{ date, count }]                 // last N days
 *   donationsSeries: [{ date, amount }]                // last N days
 */
export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const hostUserId = searchParams.get('host_user_id');
        const workspaceId = searchParams.get('workspace_id');
        const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10), 7), 90);

        if (!hostUserId) {
            return NextResponse.json({ success: false, message: 'host_user_id is required' }, { status: 400 });
        }

        const now = new Date();
        const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        // Resolve rooms for this host, optionally narrowed to one workspace.
        const roomFilter = { user_id: hostUserId };
        if (workspaceId) roomFilter.workspaceId = workspaceId;

        const recordingFilter = { hostUserId };
        if (workspaceId) recordingFilter.workspaceId = workspaceId;

        // Donations: scope to workspace when provided, otherwise platform-wide.
        // Per-host attribution lands when donations capture hostUserId at giving time.
        const donationMatch = { status: 'succeeded' };
        if (workspaceId) {
            const mongooseMod = (await import('mongoose')).default;
            donationMatch.workspaceId = new mongooseMod.Types.ObjectId(workspaceId);
        }

        const recentDonationsFilter = { status: 'succeeded', timestamp: { $gte: since } };
        if (workspaceId) recentDonationsFilter.workspaceId = workspaceId;

        // Fire the independent reads in parallel — they don't depend on each
        // other (prayer counts depend on roomIds but we resolve those after).
        const [rooms, recordings, donationsAgg, recentDonations] = await Promise.all([
            roomModel.find(roomFilter).lean(),
            recordingModel.find(recordingFilter).lean(),
            donationModel.aggregate([
                { $match: donationMatch },
                { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
            ]),
            donationModel.find(recentDonationsFilter, { amount: 1, timestamp: 1 }).lean(),
        ]);

        const roomIds = rooms.map((r) => r.room_id);

        // --- Totals
        const totalSessions = rooms.length;
        const totalRecordings = recordings.length;

        const prayerCounts = await prayerRequestModel.aggregate([
            { $match: { roomId: { $in: roomIds } } },
            { $group: { _id: '$status', n: { $sum: 1 } } },
        ]);
        const prayerBreakdown = { pending: 0, prayed: 0, archived: 0 };
        for (const row of prayerCounts) {
            if (row._id in prayerBreakdown) prayerBreakdown[row._id] = row.n;
        }
        const totalPrayers = prayerBreakdown.pending + prayerBreakdown.prayed + prayerBreakdown.archived;

        const donationsCount = donationsAgg[0]?.count || 0;
        const donationsAmount = Math.round((donationsAgg[0]?.amount || 0) * 100) / 100;

        // --- Live sessions: started in past, end_time in future.
        // Note: roomModel.end_time is stored as String. Coerce defensively.
        const liveCount = rooms.filter((r) => {
            const start = r.start_time ? new Date(r.start_time) : null;
            const end = r.end_time ? new Date(r.end_time) : null;
            return start && end && !isNaN(end.getTime()) && start <= now && end >= now;
        }).length;

        // --- Upcoming: scheduled rooms in the future.
        const upcomingRooms = rooms
            .filter((r) => r.isSchedule && r.scheduleTime && new Date(r.scheduleTime) > now)
            .sort((a, b) => new Date(a.scheduleTime).getTime() - new Date(b.scheduleTime).getTime());
        const upcomingCount = upcomingRooms.length;
        const nextUpcoming = upcomingRooms[0]
            ? {
                room_id: upcomingRooms[0].room_id,
                scheduleTime: upcomingRooms[0].scheduleTime,
                description: upcomingRooms[0].description || null,
              }
            : null;

        // --- Sessions series: last N days bucketed by start_time.
        const dayKey = (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD
        const sessionsByDay = new Map();
        const donationsByDay = new Map();

        // Pre-seed days so the chart isn't sparse.
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const k = dayKey(d);
            sessionsByDay.set(k, 0);
            donationsByDay.set(k, 0);
        }

        for (const r of rooms) {
            if (!r.start_time) continue;
            const t = new Date(r.start_time);
            if (t < since) continue;
            const k = dayKey(t);
            if (sessionsByDay.has(k)) sessionsByDay.set(k, sessionsByDay.get(k) + 1);
        }

        for (const d of recentDonations) {
            const k = dayKey(new Date(d.timestamp));
            if (donationsByDay.has(k)) donationsByDay.set(k, donationsByDay.get(k) + (d.amount || 0));
        }

        const sessionsSeries = Array.from(sessionsByDay.entries()).map(([date, count]) => ({ date, count }));
        const donationsSeries = Array.from(donationsByDay.entries()).map(([date, amount]) => ({
            date,
            amount: Math.round(amount * 100) / 100,
        }));

        return NextResponse.json({
            success: true,
            totals: {
                sessions: totalSessions,
                recordings: totalRecordings,
                prayers: totalPrayers,
                donationsCount,
                donationsAmount,
            },
            live: { count: liveCount },
            upcoming: { count: upcomingCount, next: nextUpcoming },
            prayerBreakdown,
            sessionsSeries,
            donationsSeries,
            rangeDays: days,
        }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/dashboard-stats error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
