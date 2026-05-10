import { NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import connectDB from '@/lib/connnectDB';
import recordingModel from '@/lib/recordingModel';
import { notify } from '@/lib/notify';

/**
 * LiveKit webhook receiver.
 * Configure in LiveKit Cloud → Project Settings → Webhooks:
 *   URL: https://<your-domain>/api/livekit/webhook
 *   Events: egress_started, egress_updated, egress_ended
 *
 * Verifies the JWT signature using your project's API key/secret.
 */
export async function POST(req) {
    try {
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        if (!apiKey || !apiSecret) {
            return NextResponse.json({ ok: false, message: 'Server misconfigured' }, { status: 500 });
        }
        const receiver = new WebhookReceiver(apiKey, apiSecret);

        const body = await req.text();
        const authHeader = req.headers.get('authorization') || '';
        const event = await receiver.receive(body, authHeader);

        // Egress events carry an `egressInfo` payload with status + file output details.
        if (event && (event.event === 'egress_ended' || event.event === 'egress_updated' || event.event === 'egress_started')) {
            const info = event.egressInfo;
            if (!info?.egressId) {
                return NextResponse.json({ ok: true, ignored: 'no egressId' }, { status: 200 });
            }

            await connectDB();

            // Map LiveKit's enum to our model's status strings.
            // EgressStatus enum (numeric in proto): 0 STARTING, 1 ACTIVE, 2 ENDING, 3 COMPLETE, 4 FAILED, 5 ABORTED.
            const statusMap = {
                0: 'starting',
                1: 'recording',
                2: 'recording',
                3: 'completed',
                4: 'failed',
                5: 'aborted',
                EGRESS_STARTING: 'starting',
                EGRESS_ACTIVE: 'recording',
                EGRESS_ENDING: 'recording',
                EGRESS_COMPLETE: 'completed',
                EGRESS_FAILED: 'failed',
                EGRESS_ABORTED: 'aborted',
            };
            const mapped = statusMap[info.status] || 'recording';

            const update = { status: mapped };
            if (mapped === 'completed' || mapped === 'failed' || mapped === 'aborted') {
                update.endedAt = new Date();
            }

            // Pull the first file output (we only configure one per recording).
            const fileResult = info.fileResults?.[0] || info.file;
            if (fileResult?.location) {
                update.fileUrl = fileResult.location;
            }
            if (fileResult?.duration) {
                // duration is reported in nanoseconds (BigInt) by LiveKit; convert to seconds.
                const durNs = typeof fileResult.duration === 'bigint'
                    ? Number(fileResult.duration)
                    : Number(fileResult.duration);
                if (Number.isFinite(durNs)) {
                    update.durationSec = Math.round(durNs / 1e9);
                }
            }

            const updated = await recordingModel.findOneAndUpdate(
                { egressId: info.egressId },
                update,
                { new: true }
            );

            // Notify the host on terminal states (success or failure).
            if (updated?.hostUserId && (mapped === 'completed' || mapped === 'failed')) {
                if (mapped === 'completed') {
                    await notify({
                        userId: updated.hostUserId,
                        type: 'recording.ready',
                        title: '🎬 Recording ready',
                        body: updated.title || `Your worship recording is ready to watch.`,
                        link: '/dashboard/recordings',
                        icon: '🎬',
                    });
                } else {
                    await notify({
                        userId: updated.hostUserId,
                        type: 'recording.failed',
                        title: '⚠️ Recording failed',
                        body: updated.title || 'A recording could not be saved. Check storage settings.',
                        link: '/dashboard/recordings',
                        icon: '⚠️',
                    });
                }
            }
        }

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error) {
        console.error('LiveKit webhook error:', error);
        return NextResponse.json({ ok: false, message: error?.message }, { status: 500 });
    }
}
