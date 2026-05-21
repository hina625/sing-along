import connectDB from './connnectDB';
import subscriptionModel from './userModel';
import roomModel from './roomModel';
import { getPlan, planslist } from '@/constants';

/**
 * Resolve the plan record for a Clerk user_id.
 * Defaults to 'free' if no subscription row exists or it has expired.
 */
export async function resolveUserPlan(userId) {
    if (!userId) return getPlan('free');
    await connectDB();
    const sub = await subscriptionModel.findOne({ user_id: userId }).lean();
    if (!sub) return getPlan('free');
    // Expired subscriptions revert to free.
    if (sub.subscription_expire && new Date(sub.subscription_expire) < new Date()) {
        return getPlan('free');
    }
    return getPlan(sub.subscription);
}

/**
 * Pre-flight check before creating a meeting.
 * Returns { allowed, reason } — caller should 403/402 with reason on rejection.
 *
 *   const guard = await canStartMeeting(userId);
 *   if (!guard.allowed) return NextResponse.json({ success: false, message: guard.reason }, { status: 402 });
 */
export async function canStartMeeting(userId) {
    if (!userId) return { allowed: false, reason: 'Sign in to start a meeting.' };

    const plan = await resolveUserPlan(userId);

    // Daily meeting count cap.
    if (plan.meetingsPerDay > 0) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayCount = await roomModel.countDocuments({
            user_id: userId,
            start_time: { $gte: startOfDay },
        });
        if (todayCount >= plan.meetingsPerDay) {
            return {
                allowed: false,
                reason: `You're on the ${plan.title} plan, which allows ${plan.meetingsPerDay} meeting${plan.meetingsPerDay === 1 ? '' : 's'} per day. Upgrade to host more.`,
            };
        }
    }
    return { allowed: true, plan };
}

/**
 * Check whether the user's plan permits recording.
 */
export async function canRecord(userId) {
    const plan = await resolveUserPlan(userId);
    if (!plan.canRecord) {
        return { allowed: false, reason: `Your plan (${plan.title}) doesn't include recording. Upgrade to enable it.` };
    }
    return { allowed: true, plan };
}

/**
 * Idle / auto-end policy for a plan.
 *
 *   warnMin → minutes of inactivity before participants see a "closing soon" warning.
 *   endMin  → minutes of inactivity before the room is auto-ended (recordings
 *             stopped, everyone disconnected, LiveKit room torn down).
 *
 * Free is aggressive to protect infra; paid tiers get a longer leash so
 * "unlimited meetings" stays practical without abandoned rooms burning capacity.
 * Keyed on price so legacy/aliased plan keys (plus, ministry_pro, …) resolve
 * correctly without per-plan config.
 */
export function getIdlePolicy(plan) {
    const isFree = !plan || !plan.price;
    return isFree
        ? { warnMin: 5, endMin: 10 }
        : { warnMin: 15, endMin: 30 };
}

/**
 * Compute end_time honoring the plan's per-meeting duration cap.
 * Used by create-room so we never persist an end_time that exceeds the plan.
 */
export function computePlanEndTime(plan, fromDate = new Date()) {
    const minutes = plan?.min || planslist.free.min;
    return new Date(fromDate.getTime() + minutes * 60 * 1000);
}
