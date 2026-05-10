import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';
import connectDB from '@/lib/connnectDB';
import roomModel from '@/lib/roomModel';

/**
 * Host moderation actions for an in-call room.
 *
 * POST body: {
 *   action: 'mute' | 'mute-mic' | 'unmute-mic' | 'mute-camera' | 'unmute-camera'
 *         | 'remove' | 'promote' | 'demote' | 'end',
 *   room: string,                  // LiveKit room name (= room_id)
 *   targetIdentity: string,        // participant identity to act on (not needed for 'end')
 *   callerUserId: string,          // Clerk user.id of the host making the request
 * }
 *
 * Authorization: caller must be the room creator (room.user_id === callerUserId).
 *
 * Notes:
 * - 'mute' / 'mute-mic' / 'unmute-mic' toggle the target's microphone publication.
 * - 'mute-camera' / 'unmute-camera' toggle the target's camera publication.
 * - 'remove' kicks the participant via removeParticipant.
 * - 'promote' / 'demote' set a participant attribute `lk_cohost: '1' | '0'`,
 *   which the client uses to elevate worship-leader controls (lyrics, music mode).
 */

// LiveKit returns track.source either as a string ('MICROPHONE', 'CAMERA') or
// the numeric proto enum, depending on SDK version — match both.
const SOURCE_NUMERIC = { CAMERA: 1, MICROPHONE: 2 };
function findTrackBySource(participant, sourceName) {
    const numeric = SOURCE_NUMERIC[sourceName];
    return (participant.tracks || []).find(
        (t) => t.source === sourceName || t.source === numeric
    );
}
export async function POST(req) {
    try {
        const body = await req.json();
        const { action, room, targetIdentity, callerUserId } = body || {};

        // 'end' applies to the whole room and has no target participant.
        const requiresTarget = action !== 'end';

        if (!action || !room || !callerUserId || (requiresTarget && !targetIdentity)) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields: action, room, targetIdentity, callerUserId' },
                { status: 400 }
            );
        }

        // 1) Authorize: caller must be the room creator (host).
        await connectDB();
        const roomDoc = await roomModel.findOne({ room_id: room });
        if (!roomDoc) {
            return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
        }
        if (roomDoc.user_id !== callerUserId) {
            return NextResponse.json({ success: false, message: 'Forbidden — host only' }, { status: 403 });
        }

        // 2) LiveKit credentials.
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
        if (!apiKey || !apiSecret || !wsUrl) {
            return NextResponse.json(
                { success: false, message: 'LiveKit credentials missing' },
                { status: 500 }
            );
        }

        // SDK expects an HTTPS URL (not the ws://wss:// the client uses).
        const httpUrl = wsUrl.replace(/^ws/, 'http');
        const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);

        switch (action) {
            case 'mute':
            case 'mute-mic':
            case 'unmute-mic': {
                const muted = action !== 'unmute-mic';
                const participant = await svc.getParticipant(room, targetIdentity);
                const micTrack = findTrackBySource(participant, 'MICROPHONE');
                if (!micTrack) {
                    return NextResponse.json(
                        { success: false, message: 'Target has no microphone track' },
                        { status: 404 }
                    );
                }
                await svc.mutePublishedTrack(room, targetIdentity, micTrack.sid, muted);
                return NextResponse.json({ success: true, action, target: targetIdentity }, { status: 200 });
            }

            case 'mute-camera':
            case 'unmute-camera': {
                const muted = action === 'mute-camera';
                const participant = await svc.getParticipant(room, targetIdentity);
                const camTrack = findTrackBySource(participant, 'CAMERA');
                if (!camTrack) {
                    return NextResponse.json(
                        { success: false, message: 'Target has no camera track' },
                        { status: 404 }
                    );
                }
                await svc.mutePublishedTrack(room, targetIdentity, camTrack.sid, muted);
                return NextResponse.json({ success: true, action, target: targetIdentity }, { status: 200 });
            }

            case 'remove': {
                await svc.removeParticipant(room, targetIdentity);
                return NextResponse.json({ success: true, action, target: targetIdentity }, { status: 200 });
            }

            case 'promote':
            case 'demote': {
                const value = action === 'promote' ? '1' : '0';
                await svc.updateParticipant(room, targetIdentity, {
                    attributes: { lk_cohost: value },
                });
                return NextResponse.json({ success: true, action, target: targetIdentity }, { status: 200 });
            }

            case 'end': {
                // End the call for everyone — disconnects all participants and
                // tears the room down on the LiveKit server.
                await svc.deleteRoom(room);
                return NextResponse.json({ success: true, action }, { status: 200 });
            }

            default:
                return NextResponse.json(
                    { success: false, message: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('moderate endpoint error:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Moderation failed' },
            { status: 500 }
        );
    }
}
