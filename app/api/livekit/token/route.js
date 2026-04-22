import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

/**
 * LiveKit Token Generation API
 * This endpoint provides access tokens for joining LiveKit rooms.
 * It handles both authenticated users (via Clerk) and guest users.
 */
export async function GET(req) {
  const room = req.nextUrl.searchParams.get('room');
  const identity = req.nextUrl.searchParams.get('identity');

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
