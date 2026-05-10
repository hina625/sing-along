'use client';

import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useUser } from '@clerk/nextjs';
import { ArrowRight, Calendar, Clock, Copy, Globe, Lock } from 'lucide-react';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';
import { useToast } from './ui/use-toast';
import Loader from './Loader';

interface IRoomDetails {
  end_time: string;
  room_id: string;
  start_time: string;
  user_id: string;
  user_plan: string;
  _id: string;
  scheduleTime?: string;
  description?: string | null;
  status?: 'public' | 'private';
  mode?: 'worship' | 'business' | 'hybrid';
  image?: { url: string | null; public_id: string | null } | null;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatScheduled(date: Date) {
  const day = WEEKDAYS[date.getDay()];
  const datePart = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { day, datePart, timePart };
}

function relative(date: Date) {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return 'starting now';
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;
  if (hrs > 0) return `in ${hrs} hour${hrs === 1 ? '' : 's'}`;
  if (mins > 0) return `in ${mins} min`;
  return 'starting now';
}

const CallListUpcoming = () => {
  const [meetings, setMeetings] = useState<IRoomDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const { activeWorkspace } = useContext(WorkspaceContext);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ user_id: user.id, upcoming: 'true' });
        if (activeWorkspace?._id) params.set('workspace_id', activeWorkspace._id);
        const res = await axios.get(`/api/v1/get-rooms?${params.toString()}`);
        if (!cancelled) setMeetings(res.data?.rooms || []);
      } catch (err) {
        console.error('upcoming load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, activeWorkspace?._id]);

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast({ title: 'Meeting ID copied' });
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  if (loading && meetings.length === 0) return <Loader />;

  if (meetings.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-deep-gold/10 border border-deep-gold/30 flex items-center justify-center">
            <Calendar size={26} className="text-deep-gold" />
          </div>
          <h2 className="text-white text-2xl font-semibold">Nothing scheduled</h2>
          <p className="text-white/55 mt-1.5 text-sm">
            Schedule a service or meeting and it will appear here.
          </p>
        </div>
      </div>
    );
  }

  // Earliest first.
  const sorted = [...meetings].sort((a, b) => {
    const ta = new Date(a.scheduleTime || a.start_time).getTime();
    const tb = new Date(b.scheduleTime || b.start_time).getTime();
    return ta - tb;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 max-w-7xl mx-auto w-full px-2">
      {sorted.map((room) => {
        const dt = new Date(room.scheduleTime || room.start_time);
        const { day, datePart, timePart } = formatScheduled(dt);
        const isPublic = room.status === 'public';
        const mode = room.mode || 'worship';
        const fallbackTitle = mode === 'business' ? 'Team meeting'
          : mode === 'hybrid' ? 'Session'
          : 'Worship service';
        const title = (room.description || '').trim() || fallbackTitle;
        const cover = room.image?.url || null;

        return (
          <article
            key={room.room_id}
            className="rounded-2xl border border-white/10 bg-background-3/40 backdrop-blur-xl overflow-hidden hover:border-deep-gold/40 transition group flex flex-col"
          >
            <div className="relative h-32 w-full overflow-hidden shrink-0">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-royal-purple via-[#3d1d62] to-deep-gold/60" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />

              <div className="absolute top-3 right-3">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-bold border backdrop-blur-sm ${
                    isPublic
                      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
                      : 'bg-white/10 text-white/80 border-white/20'
                  }`}
                >
                  {isPublic ? <Globe size={11} /> : <Lock size={11} />}
                  {isPublic ? 'Public' : 'Private'}
                </span>
              </div>

              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-deep-gold/90 font-bold mb-1">
                  {relative(dt)}
                </p>
                <h3 className="text-white text-lg font-bold leading-tight line-clamp-2" title={title}>
                  {title}
                </h3>
              </div>
            </div>

            <div className="p-4 flex flex-col gap-3 flex-1">
              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-deep-gold mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold truncate">{day}, {datePart}</p>
                  <p className="text-white/60 text-sm flex items-center gap-1.5 mt-0.5">
                    <Clock size={12} />{timePart}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 mt-auto border-t border-white/5">
                <button
                  onClick={() => copyId(room.room_id)}
                  className="flex items-center gap-1.5 text-xs text-white/55 hover:text-white font-mono transition"
                  title="Copy meeting ID"
                >
                  <Copy size={12} />
                  {room.room_id.slice(0, 8)}…
                </button>
                <Link
                  href={`/dashboard/beforemeet/${room.room_id}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-royal-purple to-deep-gold text-white text-sm font-semibold hover:brightness-110 transition shadow-lg shadow-royal-purple/20"
                >
                  Open lobby <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default CallListUpcoming;
