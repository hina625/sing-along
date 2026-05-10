'use server';

import { AccessToken } from 'livekit-server-sdk';
import { currentUser } from '@clerk/nextjs/server';

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export const tokenProvider = async (room?: string): Promise<string> => {
  const user = await currentUser();
  if (!user) throw new Error('User is not logged in');
  if (!API_KEY || !API_SECRET) throw new Error('LiveKit credentials missing');

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: user.id,
    name: user.username || user.firstName || user.id,
    ttl: 60 * 60,
  });

  at.addGrant({
    roomJoin: true,
    room: room || '*',
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });

  return at.toJwt();
};
