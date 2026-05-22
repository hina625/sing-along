import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/connnectDB';
import roomModel from '@/lib/roomModel';
import waitingRoomModel from '@/lib/waitingRoomModel';

/**
 * LiveKit Token Generation API
 *
 * Issues a short-lived JWT for joining a LiveKit room. Admission is now
 * gated by the waiting room — non-host callers must present an `admit_key`
 * whose entry has been moved to status='admitted' by the host.
 *
 * Bypass: when `user_id` matches the room creator (the host), no key is
 * required so the host can never lock themselves out.
 */
export async function GET(req) {
  const room = req.nextUrl.searchParams.get('room');
  const identity = req.nextUrl.searchParams.get('identity');
  const userId = req.nextUrl.searchParams.get('user_id');
  const admitKey = req.nextUrl.searchParams.get('admit_key');

  if (!room) {
    return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
  }

  if (!identity) {
    return NextResponse.json({ error: 'Missing "identity" query parameter' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: 'Server misconfigured: LiveKit credentials missing' }, { status: 500 });
  }

  try {
    await connectDB();
    const roomDoc = await roomModel.findOne({ room_id: room }, { user_id: 1, allowAnyone: 1, passcodeEnabled: 1 }).lean();
    if (!roomDoc) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isHost = !!(userId && roomDoc.user_id && userId === roomDoc.user_id);
    // Host can disable the gate at any time via the policy endpoint — when on,
    // every caller skips straight to a token, but we still validate the room
    // exists above.
    const allowAnyone = !!roomDoc.allowAnyone;
    // Breakout child rooms (`<parent>-bo-<n>`) have no host gate — admission
    // was already granted at the parent, so a second handshake would just
    // strand participants when the host re-assigns them mid-call.
    const isBreakoutChild = /-bo-\d+$/.test(room);

    // A passcode-protected room ALWAYS requires a valid admission entry, even
    // when allowAnyone is on: the passcode is verified at the knock step, which
    // is the only thing that mints an admitted entry. Without this, allowAnyone
    // would let anyone skip straight to a token and defeat the passcode.
    const requiresAdmission = !allowAnyone || !!roomDoc.passcodeEnabled;

    if (!isHost && requiresAdmission && !isBreakoutChild) {
      if (!admitKey) {
        return NextResponse.json(
          { error: 'Waiting for host approval', code: 'admission_required' },
          { status: 403 }
        );
      }
      const entry = await waitingRoomModel.findOne(
        { room_id: room, key: admitKey },
        { status: 1 }
      ).lean();
      if (!entry) {
        return NextResponse.json(
          { error: 'Admission key not recognized', code: 'admission_invalid' },
          { status: 403 }
        );
      }
      if (entry.status === 'denied') {
        return NextResponse.json(
          { error: 'Host did not let you in', code: 'admission_denied' },
          { status: 403 }
        );
      }
      if (entry.status !== 'admitted') {
        return NextResponse.json(
          { error: 'Waiting for host approval', code: 'admission_pending' },
          { status: 403 }
        );
      }
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity,
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    return NextResponse.json({ token: await at.toJwt() });
  } catch (error) {
    console.error('LiveKit token error:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
