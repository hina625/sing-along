import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import altarCallModel from "@/lib/altarCallModel";
import roomModel from "@/lib/roomModel";
import { notify } from "@/lib/notify";

/**
 * Altar Call API.
 *
 * POST   { action: 'start', roomId, hostUserId, type, prompt }
 *        Starts an altar call for the room. Only the room creator may start.
 *        If an active call already exists for this room, it is returned (idempotent).
 *
 * PATCH  { id, hostUserId, status: 'closed' }
 *        Closes an altar call (host action). Returns the closed row with full responder list.
 *
 * GET    ?roomId=...                       in-call active call (returns the latest active or null)
 * GET    ?host_user_id=...&workspace_id=...  history for the dashboard (closed + active)
 */

const VALID_TYPES = ['salvation', 'rededication', 'healing', 'prayer', 'baptism', 'custom'];

async function authorizeHost(roomId, hostUserId) {
    const room = await roomModel.findOne({ room_id: roomId }).lean();
    if (!room) return { ok: false, status: 404, message: 'Room not found' };
    if (room.user_id !== hostUserId) return { ok: false, status: 403, message: 'Forbidden — host only' };
    return { ok: true, room };
}

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get('roomId');
        const hostUserId = searchParams.get('host_user_id');
        const workspaceId = searchParams.get('workspace_id');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

        if (roomId) {
            // In-call lookup: return the latest active call (or null) so re-joiners see it.
            const active = await altarCallModel.findOne({ roomId, status: 'active' })
                .sort({ startedAt: -1 })
                .lean();
            return NextResponse.json({ success: true, call: active || null }, { status: 200 });
        }

        if (!hostUserId && !workspaceId) {
            return NextResponse.json({ success: false, message: 'roomId, host_user_id, or workspace_id required' }, { status: 400 });
        }

        const filter = {};
        if (hostUserId) filter.hostUserId = hostUserId;
        if (workspaceId) filter.workspaceId = workspaceId;

        const calls = await altarCallModel.find(filter)
            .sort({ startedAt: -1 })
            .limit(limit)
            .lean();

        return NextResponse.json({ success: true, calls }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/altar-call error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const body = await req.json();
        const { action } = body || {};

        if (action === 'start') {
            const { roomId, hostUserId, type, prompt } = body;
            if (!roomId || !hostUserId || !type || !prompt?.trim()) {
                return NextResponse.json({ success: false, message: 'roomId, hostUserId, type, prompt required' }, { status: 400 });
            }
            const auth = await authorizeHost(roomId, hostUserId);
            if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });

            // Idempotency: only one active call per room. Return existing if present.
            const existing = await altarCallModel.findOne({ roomId, status: 'active' }).lean();
            if (existing) {
                return NextResponse.json({ success: true, call: existing, alreadyRunning: true }, { status: 200 });
            }

            const safeType = VALID_TYPES.includes(type) ? type : 'custom';
            const created = await altarCallModel.create({
                roomId,
                workspaceId: auth.room.workspaceId || null,
                hostUserId,
                type: safeType,
                prompt: prompt.trim().slice(0, 500),
                status: 'active',
            });
            return NextResponse.json({ success: true, call: created }, { status: 201 });
        }

        return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    } catch (error) {
        console.error('POST /api/v1/altar-call error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await connectDB();
        const { id, hostUserId, status } = await req.json();
        if (!id || !hostUserId || status !== 'closed') {
            return NextResponse.json({ success: false, message: 'id, hostUserId, status=closed required' }, { status: 400 });
        }
        const call = await altarCallModel.findById(id).lean();
        if (!call) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
        if (call.hostUserId !== hostUserId) {
            return NextResponse.json({ success: false, message: 'Forbidden — host only' }, { status: 403 });
        }
        const updated = await altarCallModel.findByIdAndUpdate(
            id,
            { status: 'closed', endedAt: new Date() },
            { new: true }
        );
        // Notify host with the count for follow-up.
        try {
            await notify({
                userId: hostUserId,
                type: 'system',
                title: '✝️ Altar call closed',
                body: `${updated.responders?.length || 0} responder${updated.responders?.length === 1 ? '' : 's'} for ${updated.type} — ready for follow-up.`,
                link: '/dashboard',
                icon: '✝️',
            });
        } catch (e) {
            console.error('altar.closed notify failed:', e?.message);
        }
        return NextResponse.json({ success: true, call: updated }, { status: 200 });
    } catch (error) {
        console.error('PATCH /api/v1/altar-call error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
