'use client';

import { useRouter } from 'next/navigation';
import LiveKitMeeting from './LiveKitMeeting';

interface MeetingRoomProps {
  room: string;
  identity: string;
  userId?: string;
  onLeave?: () => void;
}

const MeetingRoom = ({ room, identity, userId, onLeave }: MeetingRoomProps) => {
  const router = useRouter();
  const handleDisconnect = onLeave ?? (() => router.push('/'));

  return (
    <section className="relative h-screen w-full overflow-hidden text-white">
      <LiveKitMeeting
        room={room}
        identity={identity}
        userId={userId}
        onDisconnected={handleDisconnect}
      />
    </section>
  );
};

export default MeetingRoom;
