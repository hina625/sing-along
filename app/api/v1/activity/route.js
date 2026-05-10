import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import roomModel from "@/lib/roomModel";
import recordingModel from "@/lib/recordingModel";
import noteModel from "@/lib/noteModel";
import prayerRequestModel from "@/lib/prayerRequestModel";
import donationModel from "@/lib/donationModel";
import messageModel from "@/lib/messageModel";
import { requirePermission } from "@/lib/permissions";

/**
 * Workspace activity feed.
 *
 * GET /api/v1/activity?workspace_id=...&host_user_id=...&limit=80
 *
 * Aggregates recent events across the workspace from existing models.
 * No new ActivityModel — events are derived on read so we don't have to
 * dual-write from every flow. Trade-off: a single query fans out to ~6
 * collections; with proper workspaceId indexes this is fast enough up to
 * thousands of events. If feed perf becomes an issue we'd materialize.
 *
 * Each event:
 *   { type, ts, actor, title, body?, link?, icon, severity? }
 */
export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspace_id');
        const hostUserId = searchParams.get('host_user_id');
        const limit = Math.min(parseInt(searchParams.get('limit') || '80', 10), 300);

        if (!workspaceId && !hostUserId) {
            return NextResponse.json({ success: false, message: 'workspace_id or host_user_id required' }, { status: 400 });
        }

        // Workspace-scoped requests need view permission on activity. Legacy
        // host_user_id-only calls (no workspace context) bypass this — they
        // only see their own pre-workspace data.
        if (workspaceId && hostUserId) {
            const denied = await requirePermission({
                workspaceId, userId: hostUserId, resource: 'activity', action: 'view',
            });
            if (denied) return denied;
        }

        // Per-collection scoping: prefer workspace_id (direct, indexed) and fall
        // back to host_user_id for legacy rows that pre-date workspace stamping.
        const wsScope = workspaceId ? { workspaceId } : null;
        const hostScope = hostUserId ? { user_id: hostUserId } : null;
        const recHostScope = hostUserId ? { hostUserId } : null;

        // Resolve which rooms count as "ours" so prayer/notes lookups can join by roomId.
        const roomFilter = wsScope || hostScope;
        const rooms = await roomModel.find(roomFilter || {}, {
            room_id: 1,
            user_id: 1,
            description: 1,
            mode: 1,
            scheduleTime: 1,
            start_time: 1,
            isSchedule: 1,
        }).lean();
        const ourRoomIds = rooms.map((r) => r.room_id);
        const roomById = new Map(rooms.map((r) => [r.room_id, r]));

        // --- Pull recent events from each source (limit each then merge) ---
        const perSource = Math.max(20, Math.ceil(limit / 2));

        const [recordings, notes, prayers, donations, files] = await Promise.all([
            recordingModel
                .find(wsScope || recHostScope || {})
                .sort({ startedAt: -1 })
                .limit(perSource)
                .lean(),
            noteModel
                .find({ roomId: { $in: ourRoomIds } })
                .sort({ timestamp: -1 })
                .limit(perSource)
                .lean(),
            prayerRequestModel
                .find({ roomId: { $in: ourRoomIds } })
                .sort({ timestamp: -1 })
                .limit(perSource)
                .lean(),
            donationModel
                .find(wsScope || {})
                .sort({ timestamp: -1 })
                .limit(perSource)
                .lean(),
            // File messages (chat with fileUrl set) act as a "shared a file" event.
            messageModel
                .find({ roomId: { $in: ourRoomIds }, fileUrl: { $ne: null } })
                .sort({ timestamp: -1 })
                .limit(perSource)
                .lean(),
        ]);

        const events = [];

        // Sessions (created or scheduled).
        for (const r of rooms) {
            const ts = r.start_time ? new Date(r.start_time) : null;
            if (!ts || isNaN(ts.getTime())) continue;
            const isWorship = (r.mode || 'worship') === 'worship';
            events.push({
                type: r.isSchedule ? 'session.scheduled' : 'session.started',
                ts: ts.toISOString(),
                actor: null, // creator user id known via r.user_id but no name
                title: r.isSchedule
                    ? `Service scheduled${r.description ? `: ${r.description}` : ''}`
                    : `${isWorship ? 'Worship' : 'Meeting'} started${r.description ? `: ${r.description}` : ''}`,
                link: `/meeting/${r.room_id}`,
                icon: r.isSchedule ? '📅' : (isWorship ? '🎶' : '💼'),
            });
        }

        for (const rec of recordings) {
            const ts = rec.endedAt || rec.startedAt;
            if (!ts) continue;
            events.push({
                type: rec.status === 'completed' ? 'recording.ready' : (rec.status === 'failed' ? 'recording.failed' : 'recording.started'),
                ts: new Date(ts).toISOString(),
                actor: null,
                title: rec.status === 'completed' ? 'Recording ready'
                    : rec.status === 'failed' ? 'Recording failed'
                    : 'Recording started',
                body: rec.title || null,
                link: '/dashboard/recordings',
                icon: rec.status === 'completed' ? '🎬' : (rec.status === 'failed' ? '⚠️' : '🔴'),
                severity: rec.status === 'failed' ? 'warn' : undefined,
            });
        }

        for (const n of notes) {
            events.push({
                type: 'note.added',
                ts: new Date(n.timestamp).toISOString(),
                actor: n.authorName || 'Someone',
                title: `${n.authorName || 'Someone'} added a note`,
                body: (n.content || '').slice(0, 140) + ((n.content || '').length > 140 ? '…' : ''),
                link: `/meeting/${n.roomId}`,
                icon: '📝',
            });
        }

        for (const p of prayers) {
            events.push({
                type: 'prayer.new',
                ts: new Date(p.timestamp).toISOString(),
                actor: p.senderName || 'Someone',
                title: `${p.senderName || 'Someone'} submitted a prayer request`,
                body: (p.content || '').slice(0, 140) + ((p.content || '').length > 140 ? '…' : ''),
                link: '/dashboard/prayer-requests',
                icon: '🙏',
            });
        }

        for (const d of donations) {
            events.push({
                type: 'donation.received',
                ts: new Date(d.timestamp).toISOString(),
                actor: `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'A friend',
                title: `Donation received — $${(d.amount || 0).toLocaleString()}`,
                body: d.firstName ? `From ${d.firstName} ${d.lastName || ''}`.trim() : null,
                link: '/dashboard',
                icon: '💛',
            });
        }

        for (const f of files) {
            events.push({
                type: 'file.shared',
                ts: new Date(f.timestamp).toISOString(),
                actor: f.senderName || 'Someone',
                title: `${f.senderName || 'Someone'} shared a file`,
                body: f.fileName || 'attachment',
                link: `/meeting/${f.roomId}`,
                icon: '📎',
            });
        }

        // Sort newest-first and trim.
        events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
        const trimmed = events.slice(0, limit);

        return NextResponse.json({ success: true, events: trimmed, total: events.length }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/activity error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
