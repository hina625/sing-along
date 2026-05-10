import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import prayerRequestModel from "@/lib/prayerRequestModel";
import roomModel from "@/lib/roomModel";
import { notify } from "@/lib/notify";
import { hasPermission, requirePermission } from "@/lib/permissions";

/**
 * GET: Fetch prayer requests.
 * Modes:
 *   - ?roomId=...                 → requests for one room (in-call use)
 *   - ?host_user_id=...           → all requests across rooms the user hosts (dashboard queue)
 * Optional: visibility ('public'|'private'|'all'), status, limit
 */
export const GET = async (req) => {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get('roomId');
        const hostUserId = searchParams.get('host_user_id');
        const workspaceId = searchParams.get('workspace_id');
        const visibility = searchParams.get('visibility') || 'all';
        const status = searchParams.get('status');
        const prayedBy = searchParams.get('prayed_by');
        const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

        if (!roomId && !hostUserId && !workspaceId) {
            return NextResponse.json({ success: false, message: "roomId, host_user_id, or workspace_id is required" }, { status: 400 });
        }

        const filter = {};

        // Visibility cap: members with view-only see public prayers; only those
        // with manage (hosts/prayer team/admins) see private ones. Determined
        // up-front so workspace-scoped reads can apply it.
        let visibilityCap = null;
        if (workspaceId && hostUserId) {
            const denied = await requirePermission({
                workspaceId, userId: hostUserId, resource: 'prayerRequests', action: 'view',
            });
            if (denied) return denied;
            const canManage = await hasPermission({
                workspaceId, userId: hostUserId, resource: 'prayerRequests', action: 'manage',
            });
            if (!canManage) visibilityCap = 'public';
        }

        if (roomId) {
            filter.roomId = roomId;
        } else if (workspaceId) {
            // Workspace-wide scope: every member with view sees all the workspace's
            // prayer requests, no longer limited to rooms the requester hosted.
            filter.workspaceId = workspaceId;
        } else {
            // Legacy fallback for non-workspace data: scope by the host's rooms.
            const rooms = await roomModel.find({ user_id: hostUserId }, { room_id: 1 }).lean();
            const roomIds = rooms.map((r) => r.room_id);
            if (roomIds.length === 0) {
                return NextResponse.json({ success: true, requests: [] }, { status: 200 });
            }
            filter.roomId = { $in: roomIds };
        }

        // Apply user-requested visibility filter, capped by permission.
        if (visibility === 'public' || visibility === 'private') {
            if (visibilityCap && visibility !== visibilityCap) {
                return NextResponse.json({ success: true, requests: [] }, { status: 200 });
            }
            filter.visibility = visibility;
        } else if (visibilityCap) {
            filter.visibility = visibilityCap;
        }
        if (status) filter.status = status;
        if (prayedBy) filter.prayedBy = prayedBy;

        const requests = await prayerRequestModel.find(filter)
            .sort({ timestamp: -1 })
            .limit(limit);

        return NextResponse.json({ success: true, requests }, { status: 200 });
    } catch (error) {
        console.error("GET /api/v1/prayer-request error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
};

/**
 * POST: Submit a new prayer request.
 */
export const POST = async (req) => {
    try {
        await connectDB();
        const { roomId, senderId, senderName, content, visibility } = await req.json();

        if (!roomId || !senderId || !content?.trim()) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        // Inherit workspaceId from the room so dashboards can scope without joins.
        const parentRoom = await roomModel.findOne({ room_id: roomId }, { workspaceId: 1 }).lean();
        const created = await prayerRequestModel.create({
            roomId,
            workspaceId: parentRoom?.workspaceId || null,
            senderId,
            senderName: senderName || 'Anonymous',
            content: content.trim().slice(0, 1000),
            visibility: visibility === 'public' ? 'public' : 'private',
        });

        // Fan-out: notify the room's host so the bell badge updates.
        try {
            const room = await roomModel.findOne({ room_id: roomId }, { user_id: 1 }).lean();
            if (room?.user_id) {
                await notify({
                    userId: room.user_id,
                    type: 'prayer.new',
                    title: '🙏 New prayer request',
                    body: `${created.senderName}: ${created.content.slice(0, 120)}${created.content.length > 120 ? '…' : ''}`,
                    link: '/dashboard/prayer-requests',
                    icon: '🙏',
                });
            }
        } catch (notifyErr) {
            console.error('prayer.new notify failed:', notifyErr?.message);
        }

        return NextResponse.json({ success: true, request: created }, { status: 201 });
    } catch (error) {
        console.error("POST /api/v1/prayer-request error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
};

/**
 * PATCH: two distinct flows discriminated by the body shape.
 *
 *   { id, action: 'togglePray', user_id }
 *     → toggles user_id in the request's prayedBy array. Available to anyone
 *       with prayerRequests.view (so every workspace member can mark "I prayed
 *       for this"). Idempotent toggle — second call removes the user.
 *
 *   { id, status, user_id }
 *     → host/prayer-team flow. Updates the global status (pending/prayed/
 *       archived). Requires prayerRequests.manage.
 */
export const PATCH = async (req) => {
    try {
        await connectDB();
        const body = await req.json();
        const { id, action, user_id, status } = body;
        if (!id) {
            return NextResponse.json({ success: false, message: "id is required" }, { status: 400 });
        }
        const existing = await prayerRequestModel.findById(id, { workspaceId: 1, prayedBy: 1 }).lean();
        if (!existing) {
            return NextResponse.json({ success: false, message: "Prayer request not found" }, { status: 404 });
        }

        if (action === 'togglePray') {
            if (!user_id) {
                return NextResponse.json({ success: false, message: "user_id is required" }, { status: 400 });
            }
            if (existing.workspaceId) {
                const denied = await requirePermission({
                    workspaceId: existing.workspaceId, userId: user_id, resource: 'prayerRequests', action: 'view',
                });
                if (denied) return denied;
            }
            const isPraying = (existing.prayedBy || []).includes(user_id);
            const update = isPraying
                ? { $pull: { prayedBy: user_id } }
                : { $addToSet: { prayedBy: user_id } };
            const updated = await prayerRequestModel.findByIdAndUpdate(id, update, { new: true });
            return NextResponse.json({ success: true, request: updated, praying: !isPraying }, { status: 200 });
        }

        if (!['pending', 'prayed', 'archived'].includes(status)) {
            return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
        }
        // Workspace-scoped requests need manage permission. Legacy rows without
        // workspaceId aren't gated (they pre-date workspaces).
        if (existing.workspaceId && user_id) {
            const denied = await requirePermission({
                workspaceId: existing.workspaceId, userId: user_id, resource: 'prayerRequests', action: 'manage',
            });
            if (denied) return denied;
        }
        const updated = await prayerRequestModel.findByIdAndUpdate(id, { status }, { new: true });
        return NextResponse.json({ success: true, request: updated }, { status: 200 });
    } catch (error) {
        console.error("PATCH /api/v1/prayer-request error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
};
