import connectDB from './connnectDB';
import notificationModel from './notificationModel';

/**
 * Server-side helper to push a notification.
 * Safe to await but never throws — failures are logged so callers stay focused on their own work.
 *
 *   await notify({
 *     userId: 'clerk_user_id',
 *     type: 'prayer.new',
 *     title: '🙏 New prayer request',
 *     body: 'Sister Mary requested prayer for healing.',
 *     link: '/dashboard/prayer-requests',
 *     icon: '🙏',
 *   });
 */
export async function notify({ userId, type, title, body = '', link = null, icon = null }) {
    if (!userId || !type || !title) {
        console.error('notify(): missing required fields');
        return null;
    }
    try {
        await connectDB();
        return await notificationModel.create({ userId, type, title, body, link, icon });
    } catch (err) {
        console.error('notify() failed (non-fatal):', err?.message);
        return null;
    }
}
