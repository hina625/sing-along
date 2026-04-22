import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import messageModel from "@/lib/messageModel";

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
        const { roomId, senderId, senderName, content } = await req.json();

        if (!roomId || !senderId || !content) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const newMessage = await messageModel.create({
            roomId,
            senderId,
            senderName,
            content,
            timestamp: new Date()
        });

        return NextResponse.json({ success: true, message: newMessage }, { status: 201 });
    } catch (error) {
        console.error("POST /api/v1/chat error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
};
