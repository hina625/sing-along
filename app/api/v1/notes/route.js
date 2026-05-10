import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import noteModel from "@/lib/noteModel";
import roomModel from "@/lib/roomModel";
import { notify } from "@/lib/notify";

/**
 * Per-meeting shared notes.
 *
 * GET    ?roomId=...                                     in-call list (panel)
 * GET    ?host_user_id=...&workspace_id=...              dashboard list across host's rooms
 * POST   { roomId, authorUserId, authorName, content }   add a note
 * PATCH  { id, callerUserId, pinned }                    pin/unpin (host only)
 * DELETE { id, callerUserId }                            delete (author or host)
 */

async function getRoomHost(roomId) {
    const room = await roomModel.findOne({ room_id: roomId }, { user_id: 1, workspaceId: 1 }).lean();
    return room || null;
}

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get('roomId');
        const hostUserId = searchParams.get('host_user_id');
        const workspaceId = searchParams.get('workspace_id');
        const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

        if (!roomId && !hostUserId && !workspaceId) {
            return NextResponse.json({ success: false, message: 'roomId, host_user_id, or workspace_id required' }, { status: 400 });
        }

        const filter = {};
        if (roomId) {
            filter.roomId = roomId;
        } else if (workspaceId) {
            filter.workspaceId = workspaceId;
        } else {
            // Resolve host's rooms then scope.
            const rooms = await roomModel.find({ user_id: hostUserId }, { room_id: 1 }).lean();
            const roomIds = rooms.map((r) => r.room_id);
            if (roomIds.length === 0) return NextResponse.json({ success: true, notes: [] }, { status: 200 });
            filter.roomId = { $in: roomIds };
        }

        // Pinned first, then chronological.
        const notes = await noteModel
            .find(filter)
            .sort({ pinned: -1, timestamp: 1 })
            .limit(limit)
            .lean();

        return NextResponse.json({ success: true, notes }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/notes error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const { roomId, authorUserId, authorName, content } = await req.json();
        if (!roomId || !content?.trim() || !authorName?.trim()) {
            return NextResponse.json({ success: false, message: 'roomId, authorName, and content are required' }, { status: 400 });
        }
        const room = await getRoomHost(roomId);
        const note = await noteModel.create({
            roomId,
            workspaceId: room?.workspaceId || null,
            authorUserId: authorUserId || null,
            authorName: authorName.trim().slice(0, 80),
            content: content.trim().slice(0, 4000),
        });

        // Notify the host when someone else added the note.
        if (room?.user_id && (!authorUserId || authorUserId !== room.user_id)) {
            try {
                await notify({
                    userId: room.user_id,
                    type: 'system',
                    title: '📝 New meeting note',
                    body: `${note.authorName}: ${note.content.slice(0, 120)}${note.content.length > 120 ? '…' : ''}`,
                    link: `/meeting/${roomId}`,
                    icon: '📝',
                });
            } catch (e) {
                console.error('note.added notify failed:', e?.message);
            }
        }

        return NextResponse.json({ success: true, note }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/notes error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await connectDB();
        const { id, callerUserId, pinned } = await req.json();
        if (!id || !callerUserId || typeof pinned !== 'boolean') {
            return NextResponse.json({ success: false, message: 'id, callerUserId, pinned required' }, { status: 400 });
        }
        const note = await noteModel.findById(id).lean();
        if (!note) return NextResponse.json({ success: false, message: 'Note not found' }, { status: 404 });
        const room = await getRoomHost(note.roomId);
        if (!room || room.user_id !== callerUserId) {
            return NextResponse.json({ success: false, message: 'Forbidden — host only' }, { status: 403 });
        }
        const updated = await noteModel.findByIdAndUpdate(id, { pinned }, { new: true });
        return NextResponse.json({ success: true, note: updated }, { status: 200 });
    } catch (error) {
        console.error('PATCH /api/v1/notes error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await connectDB();
        const { id, callerUserId } = await req.json();
        if (!id || !callerUserId) {
            return NextResponse.json({ success: false, message: 'id and callerUserId required' }, { status: 400 });
        }
        const note = await noteModel.findById(id).lean();
        if (!note) return NextResponse.json({ success: false, message: 'Note not found' }, { status: 404 });
        const room = await getRoomHost(note.roomId);
        const isAuthor = note.authorUserId && note.authorUserId === callerUserId;
        const isHost = room?.user_id === callerUserId;
        if (!isAuthor && !isHost) {
            return NextResponse.json({ success: false, message: 'Forbidden — author or host only' }, { status: 403 });
        }
        await noteModel.findByIdAndDelete(id);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('DELETE /api/v1/notes error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
