'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import type { RoomCall } from './useGetCalls';

export const useGetCallById = (id: string | string[]) => {
  const [call, setCall] = useState<RoomCall | null>(null);
  const [isCallLoading, setIsCallLoading] = useState(true);

  const roomId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (!roomId) {
      setIsCallLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axios.get(`/api/v1/create-room?room_id=${roomId}`);
        if (!cancelled) setCall(res.data?.room || null);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setIsCallLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [roomId]);

  return { call, isCallLoading };
};
