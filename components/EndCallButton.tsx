'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';

import { Button } from './ui/button';
import { useToast } from './ui/use-toast';

interface EndCallButtonProps {
  /** LiveKit room name (= room_id). */
  room: string;
  /** Clerk user.id of the room creator (host). Button only renders when user.id matches. */
  hostUserId: string;
}

const EndCallButton = ({ room, hostUserId }: EndCallButtonProps) => {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (!user || user.id !== hostUserId) return null;

  const endCall = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await axios.post('/api/livekit/moderate', {
        action: 'end',
        room,
        callerUserId: user.id,
      });
      router.push('/');
    } catch (err: any) {
      toast({ title: 'Failed to end call', description: err?.response?.data?.message || err.message });
      setBusy(false);
    }
  };

  return (
    <Button onClick={endCall} disabled={busy} className="bg-red-500">
      {busy ? 'Ending…' : 'End call for everyone'}
    </Button>
  );
};

export default EndCallButton;
