import { RoomServiceClient, EgressClient, DataPacket_Kind } from "livekit-server-sdk";
import connectDB from "@/lib/connnectDB";
import roomModel from "@/lib/roomModel";
import recordingModel from "@/lib/recordingModel";
import { resolveUserPlan, getIdlePolicy } from "@/lib/planLimits";
import { notify } from "@/lib/notify";

/**
 * Core idle-meeting sweep — the server-authoritative side of auto-sleep/auto-end.
 * Pure logic with no HTTP concerns so it can be driven two ways:
 *   1. The in-process scheduler in instrumentation.ts (runs every minute on a
 *      long-running server — our Docker/`next start` deploy).
 *   2. The CRON_SECRET-protected route /api/v1/meeting/idle-sweep (manual runs,
 *      or for serverless deploys driven by an external scheduler).
 *
 * For each live room (one that has heartbeated at least once and isn't ended):
 *   - idle >= plan.warnMin and not yet warned → push an `idle:warning` data
 *     message to everyone still connected (clients also warn locally).
 *   - idle >= plan.endMin → stop any active recording, deleteRoom() (disconnects
 *     everyone + tears down on LiveKit), mark ended, notify the host.
 * Rooms LiveKit no longer knows about are reconciled to ended ("closed").
 *
 * @returns {Promise<{scanned:number, warned:number, ended:number, reaped:number}>}
 * @throws if LiveKit credentials are missing or the room list can't be fetched.
 */
export async function runIdleSweep() {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!apiKey || !apiSecret || !wsUrl) {
        throw new Error('LiveKit credentials missing');
    }
    const httpUrl = wsUrl.replace(/^ws/, 'http');
    const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    const egress = new EgressClient(httpUrl, apiKey, apiSecret);

    await connectDB();

    // Candidates: rooms that have started (heartbeated at least once) and
    // haven't been ended. Scheduled-but-never-started rooms have a null
    // lastActivityAt and are skipped.
    const candidates = await roomModel.find({
        lastActivityAt: { $ne: null },
        endedAt: null,
    }).lean();

    if (!candidates.length) {
        return { scanned: 0, warned: 0, ended: 0, reaped: 0 };
    }

    // One call gets every room currently live on LiveKit.
    const liveRooms = await svc.listRooms();
    const liveSet = new Set((liveRooms || []).map((r) => r.name));

    const now = Date.now();
    let warned = 0;
    let ended = 0;
    let reaped = 0;

    // Cache plan→policy per host so a busy sweep doesn't re-query the same sub.
    const policyCache = new Map();
    const policyForHost = async (userId) => {
        if (policyCache.has(userId)) return policyCache.get(userId);
        const plan = await resolveUserPlan(userId);
        const policy = getIdlePolicy(plan);
        policyCache.set(userId, policy);
        return policy;
    };

    for (const r of candidates) {
        // LiveKit already closed this room (host left, normal end, expiry).
        // Reconcile our record so it stops showing up in the sweep.
        if (!liveSet.has(r.room_id)) {
            await roomModel.updateOne(
                { _id: r._id },
                { endedAt: new Date(), endedReason: 'closed' }
            );
            reaped += 1;
            continue;
        }

        const { warnMin, endMin } = await policyForHost(r.user_id);
        const idleMin = (now - new Date(r.lastActivityAt).getTime()) / 60000;

        if (idleMin >= endMin) {
            // 1) Stop any in-flight recording so the egress doesn't keep
            //    billing/uploading after the room is gone.
            try {
                const active = await recordingModel.findOne({
                    roomId: r.room_id,
                    status: { $in: ['starting', 'recording'] },
                });
                if (active?.egressId) {
                    await egress.stopEgress(active.egressId);
                    await recordingModel.updateOne(
                        { egressId: active.egressId },
                        { status: 'completed', endedAt: new Date() }
                    );
                }
            } catch (e) {
                console.error('idle-sweep stop egress failed', r.room_id, e?.message);
            }

            // 2) Tear the room down — disconnects every participant. Clients
            //    handle the disconnect (redirect to feedback) already.
            try {
                await svc.deleteRoom(r.room_id);
            } catch (e) {
                console.error('idle-sweep deleteRoom failed', r.room_id, e?.message);
            }

            await roomModel.updateOne(
                { _id: r._id },
                { endedAt: new Date(), endedReason: 'idle' }
            );

            try {
                await notify({
                    userId: r.user_id,
                    type: 'system',
                    title: '💤 Meeting ended (inactive)',
                    body: `Your meeting was closed automatically after ${endMin} minutes of inactivity.`,
                    link: '/dashboard',
                    icon: '💤',
                });
            } catch (e) {
                console.error('idle-sweep notify failed', r.room_id, e?.message);
            }
            ended += 1;
        } else if (idleMin >= warnMin && !r.idleWarnedAt) {
            // Push a one-shot warning to everyone still connected. Clients also
            // warn locally off their own activity, so this is a synced backstop
            // more than the primary trigger.
            try {
                const closesInMin = Math.max(1, Math.round(endMin - idleMin));
                const payload = new TextEncoder().encode(
                    JSON.stringify({ type: 'idle:warning', closesInMin })
                );
                await svc.sendData(r.room_id, payload, DataPacket_Kind.RELIABLE, { topic: 'idle' });
            } catch (e) {
                console.error('idle-sweep sendData failed', r.room_id, e?.message);
            }
            await roomModel.updateOne({ _id: r._id }, { idleWarnedAt: new Date() });
            warned += 1;
        }
    }

    return { scanned: candidates.length, warned, ended, reaped };
}
