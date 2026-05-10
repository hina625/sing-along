'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';

export interface RoomCall {
  _id: string;
  room_id: string;
  user_id: string;
  user_plan?: string;
  start_time: string;
  end_time: string;
  scheduleTime?: string;
  isSchedule?: boolean;
  description?: string;
  image?: { url: string; public_id: string };
}

export interface RoomRecording {
  _id: string;
  roomId: string;
  hostUserId: string;
  title?: string;
  fileUrl?: string;
  status: 'starting' | 'recording' | 'completed' | 'failed';
  startedAt: string;
  endedAt?: string;
}

export const useGetCalls = () => {
  const { user } = useUser();
  const [endedCalls, setEndedCalls] = useState<RoomCall[]>();
  const [upcomingCalls, setUpcomingCalls] = useState<RoomCall[]>();
  const [callRecordings, setCallRecordings] = useState<RoomRecording[]>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const [endedRes, upcomingRes, recRes] = await Promise.all([
          axios.get(`/api/v1/get-rooms?user_id=${user.id}`),
          axios.get(`/api/v1/get-rooms?user_id=${user.id}&upcoming=true`),
          axios.get(`/api/livekit/recording?host_user_id=${user.id}&status=completed`),
        ]);
        setEndedCalls(endedRes.data?.rooms || []);
        setUpcomingCalls(upcomingRes.data?.rooms || []);
        setCallRecordings(recRes.data?.recordings || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user?.id]);

  return { endedCalls, upcomingCalls, callRecordings, isLoading };
};
