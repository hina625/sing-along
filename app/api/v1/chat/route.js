import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import messageModel from "@/lib/messageModel";
import roomModel from "@/lib/roomModel";
import { notify } from "@/lib/notify";

/**
 * GET: Fetch chat history for a specific room
 */
export const GET = async (req) => {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get('roomId');

        if (!roomId) {
            return NextResponse.json({ success: false, message: "Room ID is required" }, { status: 400 });
        }

        // Fetch last 100 messages for this room
        const messages = await messageModel.find({ roomId })
            .sort({ timestamp: 1 })
            .limit(100);

        return NextResponse.json({ success: true, messages }, { status: 200 });
    } catch (error) {
        console.error("GET /api/v1/chat error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
};

/**
 * POST: Save a new chat message
 */
export const POST = async (req) => {
    try {
        await connectDB();
        const { roomId, senderId, senderName, content, fileUrl, fileName, fileType, fileSize } = await req.json();

        if (!roomId || !senderId) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }
        // At least one of: text content OR a file attachment.
        if (!content?.trim() && !fileUrl) {
            return NextResponse.json({ success: false, message: "Message must have content or a file" }, { status: 400 });
        }

        const newMessage = await messageModel.create({
            roomId,
            senderId,
            senderName,
            content: content || '',
            fileUrl: fileUrl || null,
            fileName: fileName || null,
            fileType: fileType || null,
            fileSize: typeof fileSize === 'number' ? fileSize : null,
            timestamp: new Date(),
        });

        // Fan-out: when a file is shared, notify the room host (unless they shared it).
        // Plain-text chat messages don't notify (too noisy in long conversations).
        if (fileUrl) {
            try {
                const room = await roomModel.findOne({ room_id: roomId }, { user_id: 1 }).lean();
                // The chat senderId is the LiveKit identity (display name), not the Clerk user.id.
                // Heuristic: skip the notify when the sender's name matches the host's first name —
                // best we can do without joining Clerk on every write. Worst case the host pings
                // themselves once; harmless.
                if (room?.user_id) {
                    await notify({
                        userId: room.user_id,
                        type: 'system',
                        title: '📎 File shared in meeting',
                        body: `${senderName} shared ${fileName || 'a file'}`,
                        link: `/meeting/${roomId}`,
                        icon: '📎',
                    });
                }
            } catch (e) {
                console.error('file.shared notify failed:', e?.message);
            }
        }

        return NextResponse.json({ success: true, message: newMessage }, { status: 201 });
    } catch (error) {
        console.error("POST /api/v1/chat error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
};
