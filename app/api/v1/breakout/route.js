import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import breakoutSessionModel from "@/lib/breakoutSessionModel";
import roomModel from "@/lib/roomModel";

/**
 * Breakout sessions API.
 *
 * POST   { action: 'start', parentRoomId, hostUserId, groups: [{ name }, ...],
 *          assignments?: { [userId]: groupIndex } }
 *        Starts a breakout session. Creates child rooms named
 *        `<parentRoomId>-bo-<index>` and inserts shadow `room` rows so
 *        the existing token + role-lookup machinery treats them as legitimate
 *        worship rooms (the host of the parent is also host of every breakout).
 *        Optional `assignments` pre-routes specific users to specific groups —
 *        clients auto-navigate based on this map.
 *
 * PATCH  { id, hostUserId, status: 'closed' }
 *        Closes the breakout. Participants in any child room receive
 *        `breakout:close` over the data channel and are sent back to the
 *        parent room.
 *
 * PATCH  { id, hostUserId, action: 'assign', userId, groupIndex }
 *        Force-moves a participant. groupIndex 1..N puts them in that group;
 *        0 / null returns them to the parent room. Clients poll the session
 *        and react when their own assignment changes.
 *
 * GET    ?parentRoomId=...                  active session for the room
 * GET    ?host_user_id=...&workspace_id=... history (optional)
 */

async function authorizeHost(parentRoomId, hostUserId) {
    const room = await roomModel.findOne({ room_id: parentRoomId }).lean();
    if (!room) return { ok: false, status: 404, message: 'Parent room not found' };
    if (room.user_id !== hostUserId) return { ok: false, status: 403, message: 'Forbidden — host only' };
    return { ok: true, room };
}

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const parentRoomId = searchParams.get('parentRoomId');
        const hostUserId = searchParams.get('host_user_id');
        const workspaceId = searchParams.get('workspace_id');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

        if (parentRoomId) {
            const active = await breakoutSessionModel
                .findOne({ parentRoomId, status: 'active' })
                .sort({ openedAt: -1 })
                .lean();
            return NextResponse.json({ success: true, session: active || null }, { status: 200 });
        }

        const filter = {};
        if (hostUserId) filter.hostUserId = hostUserId;
        if (workspaceId) filter.workspaceId = workspaceId;
        if (Object.keys(filter).length === 0) {
            return NextResponse.json({ success: false, message: 'parentRoomId, host_user_id, or workspace_id required' }, { status: 400 });
        }
        const list = await breakoutSessionModel.find(filter).sort({ openedAt: -1 }).limit(limit).lean();
        return NextResponse.json({ success: true, sessions: list }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/breakout error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const body = await req.json();
        const { action } = body || {};

        if (action === 'start') {
            const { parentRoomId, hostUserId, groups, assignments } = body;
            if (!parentRoomId || !hostUserId || !Array.isArray(groups) || groups.length === 0) {
                return NextResponse.json({ success: false, message: 'parentRoomId, hostUserId, groups required' }, { status: 400 });
            }
            if (groups.length > 12) {
                return NextResponse.json({ success: false, message: 'Up to 12 groups per breakout session.' }, { status: 400 });
            }
            const auth = await authorizeHost(parentRoomId, hostUserId);
            if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });

            // Idempotency: only one active breakout per parent. Return existing if present.
            const existing = await breakoutSessionModel.findOne({ parentRoomId, status: 'active' }).lean();
            if (existing) {
                return NextResponse.json({ success: true, session: existing, alreadyRunning: true }, { status: 200 });
            }

            // Build group records with deterministic child room ids.
            const groupRecords = groups.slice(0, 12).map((g, i) => ({
                index: i + 1,
                name: (g.name || `Group ${i + 1}`).trim().slice(0, 60),
                roomId: `${parentRoomId}-bo-${i + 1}`,
            }));

            // Create shadow `room` rows so token + role lookups work for the child rooms.
            // Same host, same workspace — inherits permissions.
            const planMins = 240; // breakouts piggyback off the parent's plan; cap at 4h
            const childEnd = new Date(Date.now() + planMins * 60 * 1000).toUTCString();
            await Promise.all(
                groupRecords.map((g) =>
                    roomModel.updateOne(
                        { room_id: g.roomId },
                        {
                            $setOnInsert: {
                                user_id: hostUserId,
                                workspaceId: auth.room.workspaceId || null,
                                mode: auth.room.mode || 'worship',
                                room_id: g.roomId,
                                start_time: new Date(),
                                user_plan: auth.room.user_plan || 'free',
                                end_time: childEnd,
                                isSchedule: false,
                                status: 'private',
                                description: `Breakout: ${g.name}`,
                                // Breakouts have no separate host gate — anyone admitted to
                                // the parent room can move into a child without re-knocking.
                                allowAnyone: true,
                            },
                        },
                        { upsert: true }
                    )
                )
            );

            // Sanitize assignments: only keep entries that point to a real group.
            const cleanAssignments = new Map();
            if (assignments && typeof assignments === 'object') {
                const validIndices = new Set(groupRecords.map((g) => g.index));
                for (const [uid, idx] of Object.entries(assignments)) {
                    const n = Number(idx);
                    if (uid && Number.isFinite(n) && validIndices.has(n)) {
                        cleanAssignments.set(String(uid), n);
                    }
                }
            }

            const created = await breakoutSessionModel.create({
                parentRoomId,
                workspaceId: auth.room.workspaceId || null,
                hostUserId,
                groups: groupRecords,
                assignments: cleanAssignments,
                status: 'active',
            });
            return NextResponse.json({ success: true, session: created }, { status: 201 });
        }

        return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    } catch (error) {
        console.error('POST /api/v1/breakout error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await connectDB();
        const body = await req.json();
        const { id, hostUserId, action } = body || {};
        if (!id || !hostUserId) {
            return NextResponse.json({ success: false, message: 'id and hostUserId required' }, { status: 400 });
        }
        const session = await breakoutSessionModel.findById(id);
        if (!session) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
        if (session.hostUserId !== hostUserId) {
            return NextResponse.json({ success: false, message: 'Forbidden — host only' }, { status: 403 });
        }

        if (action === 'assign') {
            if (session.status !== 'active') {
                return NextResponse.json({ success: false, message: 'Session is not active' }, { status: 400 });
            }
            const { userId, groupIndex } = body;
            if (!userId) {
                return NextResponse.json({ success: false, message: 'userId required' }, { status: 400 });
            }
            const idx = groupIndex == null ? 0 : Number(groupIndex);
            if (idx !== 0) {
                const validIndices = new Set(session.groups.map((g) => g.index));
                if (!Number.isFinite(idx) || !validIndices.has(idx)) {
                    return NextResponse.json({ success: false, message: 'Invalid groupIndex' }, { status: 400 });
                }
            }
            if (idx === 0) {
                session.assignments.delete(String(userId));
            } else {
                session.assignments.set(String(userId), idx);
            }
            await session.save();
            return NextResponse.json({ success: true, session }, { status: 200 });
        }

        // Default behavior: close the session.
        if (body.status === 'closed') {
            const updated = await breakoutSessionModel.findByIdAndUpdate(
                id,
                { status: 'closed', closedAt: new Date() },
                { new: true }
            );
            return NextResponse.json({ success: true, session: updated }, { status: 200 });
        }

        return NextResponse.json({ success: false, message: 'Unknown PATCH payload' }, { status: 400 });
    } catch (error) {
        console.error('PATCH /api/v1/breakout error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
