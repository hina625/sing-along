import { NextResponse } from 'next/server';
import { EgressClient, EncodedFileType, EncodedFileOutput, S3Upload } from 'livekit-server-sdk';
import connectDB from '@/lib/connnectDB';
import roomModel from '@/lib/roomModel';
import recordingModel from '@/lib/recordingModel';

/**
 * LiveKit Egress wrapper for room composite recordings.
 *
 * GET   ?roomId=...                        list recordings for the room (host only)
 * GET   ?host_user_id=...                  list recordings across all the host's rooms
 * POST  body: { action: 'start' | 'stop', room, callerUserId, title?, egressId? }
 *
 * Storage: S3 (LiveKit Egress requires an S3-compatible bucket OR a paid LiveKit
 * Cloud account with file output). Required env:
 *   S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY,
 *   optional S3_ENDPOINT (for non-AWS providers like R2/Wasabi).
 *
 * Webhooks land at /api/livekit/webhook and patch the row's status/fileUrl/duration.
 */

function getEgressClient() {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!apiKey || !apiSecret || !wsUrl) {
        throw new Error('LiveKit credentials missing');
    }
    return new EgressClient(wsUrl.replace(/^ws/, 'http'), apiKey, apiSecret);
}

function buildFileOutput(roomId) {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
        throw new Error('S3_BUCKET env var is required for recordings');
    }
    const filepath = `recordings/${roomId}/${Date.now()}-{room_name}.mp4`;
    return new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath,
        output: {
            case: 's3',
            value: new S3Upload({
                accessKey: process.env.S3_ACCESS_KEY,
                secret: process.env.S3_SECRET_KEY,
                region: process.env.S3_REGION,
                bucket,
                endpoint: process.env.S3_ENDPOINT || undefined,
            }),
        },
    });
}

async function authorizeHost(roomId, callerUserId) {
    await connectDB();
    const roomDoc = await roomModel.findOne({ room_id: roomId });
    if (!roomDoc) return { ok: false, status: 404, message: 'Room not found' };
    if (roomDoc.user_id !== callerUserId) {
        return { ok: false, status: 403, message: 'Forbidden — host only' };
    }
    return { ok: true, room: roomDoc };
}

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get('roomId');
        const hostUserId = searchParams.get('host_user_id');
        const workspaceId = searchParams.get('workspace_id');
        const status = searchParams.get('status');
        const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

        if (!roomId && !hostUserId && !workspaceId) {
            return NextResponse.json({ success: false, message: 'roomId, host_user_id, or workspace_id is required' }, { status: 400 });
        }

        const filter = {};
        if (roomId) filter.roomId = roomId;
        if (hostUserId) filter.hostUserId = hostUserId;
        if (workspaceId) filter.workspaceId = workspaceId;
        if (status) filter.status = status;

        const recordings = await recordingModel.find(filter)
            .sort({ startedAt: -1 })
            .limit(limit);

        return NextResponse.json({ success: true, recordings }, { status: 200 });
    } catch (error) {
        console.error('GET /api/livekit/recording error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { action, room, callerUserId, title, egressId } = body || {};

        if (!action || !room || !callerUserId) {
            return NextResponse.json(
                { success: false, message: 'Missing fields: action, room, callerUserId' },
                { status: 400 }
            );
        }

        const auth = await authorizeHost(room, callerUserId);
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
        }

        const client = getEgressClient();

        if (action === 'start') {
            // Idempotency: if there is already an in-flight recording for this room, return it.
            const existing = await recordingModel.findOne({
                roomId: room,
                status: { $in: ['starting', 'recording'] },
            });
            if (existing) {
                return NextResponse.json({ success: true, recording: existing, alreadyRunning: true }, { status: 200 });
            }

            const fileOutput = buildFileOutput(room);
            const info = await client.startRoomCompositeEgress(room, {
                file: fileOutput,
                layout: 'speaker',
            });

            const created = await recordingModel.create({
                roomId: room,
                workspaceId: auth.room?.workspaceId || null,
                hostUserId: callerUserId,
                title: title || `Recording ${new Date().toLocaleString()}`,
                egressId: info.egressId,
                status: 'recording',
                startedAt: new Date(),
            });

            return NextResponse.json({ success: true, recording: created }, { status: 201 });
        }

        if (action === 'stop') {
            // Resolve egressId either from body or by looking up an active recording.
            let targetEgressId = egressId;
            if (!targetEgressId) {
                const active = await recordingModel.findOne({
                    roomId: room,
                    status: { $in: ['starting', 'recording'] },
                }).sort({ startedAt: -1 });
                targetEgressId = active?.egressId;
            }
            if (!targetEgressId) {
                return NextResponse.json({ success: false, message: 'No active recording found' }, { status: 404 });
            }
            await client.stopEgress(targetEgressId);
            await recordingModel.findOneAndUpdate(
                { egressId: targetEgressId },
                { status: 'completed', endedAt: new Date() }
            );
            return NextResponse.json({ success: true, egressId: targetEgressId }, { status: 200 });
        }

        return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    } catch (error) {
        console.error('POST /api/livekit/recording error:', error);
        return NextResponse.json({ success: false, message: error?.message || 'Recording failed' }, { status: 500 });
    }
}
