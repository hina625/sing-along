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
            endedAt: 1,
            lastActivityAt: 1,
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

        // Sessions — emit ONE event per room reflecting its current lifecycle
        // state so users can immediately tell whether something is Live now,
        // already Completed, just Scheduled for later, or simply Started.
        // Precedence: completed > live > scheduled > started.
        const nowMs = Date.now();
        const LIVE_WINDOW_MS = 5 * 60 * 1000; // heartbeat within 5 min = live
        for (const r of rooms) {
            // Always label sessions as "Meeting" regardless of room mode
            // (worship / business / hybrid) per product decision — the activity
            // feed surfaces them all as a single "Meeting" lifecycle stream.
            const sessionType = 'Meeting';
            const desc = r.description ? `: ${r.description}` : '';

            // 1. Completed — endedAt is set
            if (r.endedAt) {
                events.push({
                    type: 'session.completed',
                    ts: new Date(r.endedAt).toISOString(),
                    actor: null,
                    title: `${sessionType} completed${desc}`,
                    body: r.start_time
                        ? `Ran from ${new Date(r.start_time).toLocaleString()} to ${new Date(r.endedAt).toLocaleString()}`
                        : null,
                    status: 'completed',
                    statusLabel: 'Completed',
                    link: `/meeting/${r.room_id}`,
                    icon: '✅',
                });
                continue;
            }

            // 2. Live — recent heartbeat and not ended
            if (
                r.lastActivityAt &&
                nowMs - new Date(r.lastActivityAt).getTime() < LIVE_WINDOW_MS
            ) {
                events.push({
                    type: 'session.live',
                    ts: new Date(r.lastActivityAt).toISOString(),
                    actor: null,
                    title: `${sessionType} live now${desc}`,
                    body: 'Currently in progress — click to join',
                    status: 'live',
                    statusLabel: 'Live now',
                    link: `/meeting/${r.room_id}`,
                    icon: '🔴',
                });
                continue;
            }

            // 3. Scheduled — a future-dated scheduled meeting that hasn't started
            if (
                r.isSchedule &&
                r.scheduleTime &&
                new Date(r.scheduleTime).getTime() > nowMs
            ) {
                const ts = r.start_time ? new Date(r.start_time) : new Date();
                events.push({
                    type: 'session.scheduled',
                    ts: ts.toISOString(),
                    actor: null,
                    title: `${sessionType} scheduled${desc}`,
                    body: `For ${new Date(r.scheduleTime).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                    })}`,
                    status: 'scheduled',
                    statusLabel: 'Scheduled',
                    link: `/meeting/${r.room_id}`,
                    icon: '📅',
                });
                continue;
            }

            // 4. Started — instant or past-due-scheduled room that's not currently
            // live and has no endedAt. Catches sessions that were started and went
            // quiet without a formal end event.
            const ts = r.start_time ? new Date(r.start_time) : null;
            if (!ts || isNaN(ts.getTime())) continue;
            events.push({
                type: 'session.started',
                ts: ts.toISOString(),
                actor: null,
                title: `${sessionType} started${desc}`,
                status: 'past',
                statusLabel: 'Past',
                link: `/meeting/${r.room_id}`,
                icon: '💼',
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
            const r = roomById.get(n.roomId);
            const meetingRef = r
                ? (r.description || (r.isSchedule ? 'Scheduled meeting' : 'Meeting'))
                : 'Meeting';
            const content = (n.content || '').slice(0, 140) + ((n.content || '').length > 140 ? '…' : '');
            events.push({
                type: 'note.added',
                ts: new Date(n.timestamp).toISOString(),
                actor: n.authorName || 'Someone',
                title: `Meeting note added by ${n.authorName || 'Someone'}`,
                body: content,
                // Per-note metadata so the UI can render a source pill + meeting ref.
                // Today the only origin is the in-meeting Notes panel (manually
                // typed by participants). Reserved for AI/Whiteboard sources later.
                source: 'Meeting Notes',
                meetingRef,
                link: `/meeting/${n.roomId}`,
                icon: '📝',
            });
        }

        for (const p of prayers) {
            events.push({
                type: 'prayer.new',
                ts: new Date(p.timestamp).toISOString(),
                actor: p.senderName || 'Someone',
                title: `${p.senderName || 'Someone'} submitted a request`,
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
            // Activity row links straight to a download. For Cloudinary URLs we
            // inject `fl_attachment:<name>` so the browser saves the file with
            // its original name (cross-origin <a download> is ignored, and old
            // rows have random `file_xxx` URL tails — this is the only reliable
            // way to make them download with the proper name). Non-Cloudinary
            // URLs pass through unchanged.
            const baseName = (f.fileName || '').replace(/\.[^./\\]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
            const flag = baseName ? `fl_attachment:${baseName}` : 'fl_attachment';
            const downloadLink = /res\.cloudinary\.com/.test(f.fileUrl || '')
                ? f.fileUrl.replace(/\/(upload|authenticated|private)\/(?!.*\bfl_attachment\b)/, `/$1/${flag}/`)
                : f.fileUrl;
            events.push({
                type: 'file.shared',
                ts: new Date(f.timestamp).toISOString(),
                actor: f.senderName || 'Someone',
                title: `${f.senderName || 'Someone'} shared a file`,
                body: f.fileName || 'attachment',
                link: downloadLink || `/meeting/${f.roomId}`,
                linkExternal: !!downloadLink,
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
