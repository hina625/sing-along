'use client';
import { useEffect, useRef, useState } from 'react';

import Alert from './Alert';
import { Button } from './ui/button';

interface MeetingSetupProps {
  room: string;
  callStartsAt?: string | Date | null;
  callEndedAt?: string | Date | null;
  onJoin: (opts: { audio: boolean; video: boolean }) => void;
}

const MeetingSetup = ({ room, callStartsAt, callEndedAt, onJoin }: MeetingSetupProps) => {
  const [isMicCamOff, setIsMicCamOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const callTimeNotArrived = callStartsAt && new Date(callStartsAt) > new Date();
  const callHasEnded = !!callEndedAt;

  useEffect(() => {
    if (callTimeNotArrived || callHasEnded) return;

    let cancelled = false;
    const start = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: !isMicCamOff,
          audio: !isMicCamOff,
        };
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err: any) {
        setError(err?.message || 'Could not access camera/microphone');
      }
    };

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    start();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isMicCamOff, callTimeNotArrived, callHasEnded]);

  if (callTimeNotArrived) {
    return (
      <Alert
        title={`Your Meeting has not started yet. It is scheduled for ${new Date(callStartsAt!).toLocaleString()}`}
      />
    );
  }

  if (callHasEnded) {
    return (
      <Alert
        title="The call has been ended by the host"
        iconUrl="/icons/call-ended.svg"
      />
    );
  }

  const handleJoin = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    onJoin({ audio: !isMicCamOff, video: !isMicCamOff });
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-white">
      <h1 className="text-center text-2xl font-bold">Setup</h1>
      <p className="text-sm text-white/60">Room: {room}</p>
      <div className="w-full max-w-xl rounded-lg overflow-hidden bg-black aspect-video">
        {isMicCamOff ? (
          <div className="flex h-full w-full items-center justify-center text-white/60">
            Camera off
          </div>
        ) : (
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        )}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex h-12 items-center justify-center gap-3">
        <label className="flex items-center justify-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={isMicCamOff}
            onChange={(e) => setIsMicCamOff(e.target.checked)}
          />
          Join with mic and camera off
        </label>
      </div>
      <Button
        className="rounded-md bg-green-500 px-4 py-2.5"
        onClick={handleJoin}
      >
        Join meeting
      </Button>
    </div>
  );
};

export default MeetingSetup;
