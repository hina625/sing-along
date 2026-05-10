import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import notificationModel from "@/lib/notificationModel";

/**
 * Notifications API.
 *
 * GET    ?user_id=...&unreadOnly=1&limit=50    list user's notifications
 *                                              also returns { unreadCount } for the bell badge
 * POST   { userId, type, title, body?, link?, icon? }   create one (server-side use)
 * PATCH  { id, isRead }                        mark a single as read/unread
 *        { user_id, markAllRead: true }        mark all as read for a user
 */

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('user_id');
        const unreadOnly = searchParams.get('unreadOnly') === '1';
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

        if (!userId) {
            return NextResponse.json({ success: false, message: 'user_id is required' }, { status: 400 });
        }

        const filter = { userId };
        if (unreadOnly) filter.isRead = false;

        const [notifications, unreadCount] = await Promise.all([
            notificationModel.find(filter).sort({ timestamp: -1 }).limit(limit).lean(),
            notificationModel.countDocuments({ userId, isRead: false }),
        ]);

        return NextResponse.json({ success: true, notifications, unreadCount }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/notifications error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const { userId, type, title, body = '', link = null, icon = null } = await req.json();

        if (!userId || !type || !title) {
            return NextResponse.json(
                { success: false, message: 'userId, type, and title are required' },
                { status: 400 }
            );
        }

        const created = await notificationModel.create({
            userId, type, title, body, link, icon,
        });

        return NextResponse.json({ success: true, notification: created }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/notifications error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await connectDB();
        const body = await req.json();

        // Bulk: mark all read for a user.
        if (body?.markAllRead && body?.user_id) {
            const result = await notificationModel.updateMany(
                { userId: body.user_id, isRead: false },
                { isRead: true }
            );
            return NextResponse.json({ success: true, modified: result.modifiedCount }, { status: 200 });
        }

        // Single update.
        const { id, isRead = true } = body || {};
        if (!id) {
            return NextResponse.json({ success: false, message: 'id is required' }, { status: 400 });
        }
        const updated = await notificationModel.findByIdAndUpdate(id, { isRead }, { new: true });
        return NextResponse.json({ success: true, notification: updated }, { status: 200 });
    } catch (error) {
        console.error('PATCH /api/v1/notifications error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
