import { RoomServiceClient } from 'livekit-server-sdk';
import connectDB from './connnectDB';
import subscriptionModel from './userModel';
import roomModel from './roomModel';
import { getPlan, planslist } from '@/constants';

// Participant counts above this are treated as effectively unlimited — we skip
// the LiveKit roundtrip rather than reject a 9,999th participant on Enterprise.
const UNLIMITED_PARTICIPANT_THRESHOLD = 5000;

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
 * Pre-flight check before creating a new workspace.
 * Counts workspaces the user already *owns* (not workspaces they're a member
 * of — being added as a teammate to a Business workspace shouldn't burn the
 * Starter user's single slot). Returns 402-style payload on rejection.
 */
export async function canCreateWorkspace(userId) {
    if (!userId) return { allowed: false, reason: 'Sign in to create a workspace.' };

    const plan = await resolveUserPlan(userId);
    const cap = plan.maxWorkspaces || 0;
    if (!cap) return { allowed: true, plan }; // 0 = unlimited (Enterprise)

    // Lazy require to avoid a circular import (workspaceModel → planLimits via uploads).
    const workspaceModel = (await import('./workspaceModel')).default;
    await connectDB();
    const owned = await workspaceModel.countDocuments({ ownerUserId: userId });
    if (owned >= cap) {
        return {
            allowed: false,
            reason: `Your ${plan.title} plan includes ${cap} workspace${cap === 1 ? '' : 's'}. Upgrade to Enterprise for multiple workspaces.`,
            plan,
            cap,
            current: owned,
        };
    }
    return { allowed: true, plan, cap, current: owned };
}

/**
 * Pre-flight check before persisting an upload (chat file, song, etc).
 * Aggregates total stored bytes by the BILLING ENTITY (the workspace owner
 * for workspace uploads, the room host for personal-room uploads). Counts:
 *
 *   • songs in workspaces owned by `userId` (regardless of uploader — a
 *     teammate's song still burns the owner's quota)
 *   • chat attachments in rooms inside workspaces owned by `userId`
 *   • chat attachments in personal rooms (no workspaceId) hosted by `userId`
 *
 * Callers MUST pass the billing entity, not the actual uploader. The songs
 * route resolves workspace.ownerUserId; the chat-file route resolves room
 * → workspace owner (or room host for personal rooms).
 */
export async function canUpload(userId, incomingBytes) {
    if (!userId) return { allowed: false, reason: 'Sign in to upload.' };
    const plan = await resolveUserPlan(userId);
    const capMB = plan.storageMB || 0;
    if (!capMB) return { allowed: true, plan, capBytes: 0, usedBytes: 0 };
    const capBytes = capMB * 1024 * 1024;

    await connectDB();
    // Lazy require to avoid a circular import (models pull this module via uploads).
    const songModel = (await import('./songModel')).default;
    const messageModel = (await import('./messageModel')).default;
    const workspaceModel = (await import('./workspaceModel')).default;

    // Workspaces this user owns — defines the scope for billed storage.
    const ownedWorkspaceIds = (await workspaceModel
        .find({ ownerUserId: userId }, { _id: 1 })
        .lean()).map((w) => w._id);

    // Songs in owned workspaces (counts uploads by ANY member, not just owner).
    let songBytes = 0;
    if (ownedWorkspaceIds.length) {
        const songAgg = await songModel.aggregate([
            { $match: { workspaceId: { $in: ownedWorkspaceIds }, fileSize: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: '$fileSize' } } },
        ]);
        songBytes = Number(songAgg[0]?.total || 0);
    }

    // Rooms to bill for chat-attachment storage: every room inside an owned
    // workspace, plus the user's own personal rooms (workspaceId null/missing).
    const roomOr = [];
    if (ownedWorkspaceIds.length) roomOr.push({ workspaceId: { $in: ownedWorkspaceIds } });
    roomOr.push({
        user_id: userId,
        $or: [{ workspaceId: null }, { workspaceId: { $exists: false } }],
    });
    const hostedRoomIds = (await roomModel
        .find({ $or: roomOr }, { room_id: 1 })
        .lean()).map((r) => r.room_id);

    let chatBytes = 0;
    if (hostedRoomIds.length) {
        const chatAgg = await messageModel.aggregate([
            { $match: { roomId: { $in: hostedRoomIds }, fileSize: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: '$fileSize' } } },
        ]);
        chatBytes = Number(chatAgg[0]?.total || 0);
    }

    const usedBytes = songBytes + chatBytes;
    if (usedBytes + Number(incomingBytes || 0) > capBytes) {
        return {
            allowed: false,
            reason: `Your ${plan.title} plan includes ${capMB >= 1024 ? `${(capMB / 1024).toFixed(0)} GB` : `${capMB} MB`} of storage. You've used ${(usedBytes / (1024 * 1024)).toFixed(1)} MB. Upgrade for more.`,
            plan,
            capBytes,
            usedBytes,
        };
    }
    return { allowed: true, plan, capBytes, usedBytes };
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
 * Pre-flight check before issuing a LiveKit token to a non-host joiner.
 * Resolves the host's plan and asks LiveKit for the current participant count
 * for the room; rejects if admitting one more would exceed the host's plan cap.
 *
 * The host themselves should bypass this (they need to manage admissions even
 * at the cap). Caller already knows isHost, so we don't re-check here.
 *
 *   const guard = await canJoinRoom(room_id);
 *   if (!guard.allowed) return NextResponse.json({ error: guard.reason, code: 'plan_capacity' }, { status: 402 });
 */
export async function canJoinRoom(roomId) {
    if (!roomId) return { allowed: false, reason: 'Missing room id.' };

    await connectDB();
    const roomDoc = await roomModel.findOne({ room_id: roomId }, { user_id: 1 }).lean();
    if (!roomDoc) return { allowed: false, reason: 'Room not found.' };

    const plan = await resolveUserPlan(roomDoc.user_id);
    const cap = plan.participantCap || 0;

    // Effectively unlimited — skip the LiveKit roundtrip.
    if (!cap || cap >= UNLIMITED_PARTICIPANT_THRESHOLD) {
        return { allowed: true, plan, cap, current: null };
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!apiKey || !apiSecret || !wsUrl) {
        // Fail open on misconfiguration — we already alarmed via token route.
        return { allowed: true, plan, cap, current: null };
    }
    const httpUrl = wsUrl.replace(/^ws/, 'http');
    const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);

    let current = 0;
    try {
        // listRooms with a name filter returns at most one room; if the room
        // hasn't been created on LiveKit yet (first joiner) numParticipants
        // defaults to 0 — that's correct: we're admitting #1.
        const rooms = await svc.listRooms([roomId]);
        if (rooms && rooms.length) {
            current = Number(rooms[0]?.numParticipants || 0);
        }
    } catch (err) {
        // If LiveKit is unreachable, fail open rather than blocking everyone.
        console.error('canJoinRoom listRooms failed:', err?.message);
        return { allowed: true, plan, cap, current: null };
    }

    if (current >= cap) {
        return {
            allowed: false,
            reason: `This room is on the ${plan.title} plan, which is capped at ${cap} participants. Ask the host to upgrade for more capacity.`,
            plan,
            cap,
            current,
        };
    }
    return { allowed: true, plan, cap, current };
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
