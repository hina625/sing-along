'use client';

import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Disc, Download, ExternalLink, RefreshCw, Clock, Calendar } from 'lucide-react';
import Loader from '@/components/Loader';
import PermissionGate from '@/components/PermissionGate';
import { useToast } from '@/components/ui/use-toast';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';

interface Recording {
  _id: string;
  roomId: string;
  hostUserId: string;
  title: string | null;
  egressId: string;
  status: 'starting' | 'recording' | 'completed' | 'failed' | 'aborted';
  fileUrl: string | null;
  durationSec: number | null;
  startedAt: string;
  endedAt: string | null;
}

const STATUS_BADGE: Record<Recording['status'], { label: string; cls: string }> = {
  starting:  { label: 'Starting',   cls: 'bg-white/10 text-white/80' },
  recording: { label: 'Recording',  cls: 'bg-red-500/20 text-red-300 animate-pulse' },
  completed: { label: 'Ready',      cls: 'bg-green-500/15 text-green-300' },
  failed:    { label: 'Failed',     cls: 'bg-red-500/15 text-red-300' },
  aborted:   { label: 'Stopped',    cls: 'bg-white/5 text-white/60' },
};

function formatDuration(sec: number | null): string {
  if (!sec || sec < 1) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}

const RecordingsPage = () => {
  const { user, isLoaded } = useUser();
  const { activeWorkspace } = useContext(WorkspaceContext);
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ host_user_id: user.id, limit: '200' });
      if (activeWorkspace?._id) params.set('workspace_id', activeWorkspace._id);
      const res = await axios.get(`/api/livekit/recording?${params.toString()}`);
      if (res.data?.success) {
        setRecordings(res.data.recordings || []);
      }
    } catch (err) {
      console.error('Failed to load recordings', err);
      toast({ title: 'Could not load recordings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeWorkspace?._id, toast]);

  useEffect(() => {
    if (isLoaded) fetchRecordings();
  }, [isLoaded, fetchRecordings]);

  // Light polling so newly-uploaded files show up.
  useEffect(() => {
    if (!isLoaded) return;
    const t = setInterval(fetchRecordings, 20000);
    return () => clearInterval(t);
  }, [isLoaded, fetchRecordings]);

  if (!isLoaded) return <Loader />;

  return (
    <section className="flex size-full flex-col gap-6 text-white pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4 mt-24">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <Disc className="text-deep-gold" size={32} />
            Recordings
          </h2>
          <p className="text-white/60 mt-2 text-sm">
            Recorded sessions — re-watch, share, and archive.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchRecordings}
          className="hero-quick-link"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && recordings.length === 0 ? (
        <Loader />
      ) : recordings.length === 0 ? (
        <div className="card-premium p-10 text-center text-white/60">
          <Disc size={40} className="mx-auto mb-4 text-deep-gold/60" />
          <p className="text-lg">No recordings yet.</p>
          <p className="text-sm mt-2">Press the record button during a session to capture it here.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recordings.map((r) => {
            const badge = STATUS_BADGE[r.status];
            const dt = new Date(r.startedAt);
            return (
              <li key={r._id} className="card-premium p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-white font-semibold leading-tight truncate">
                    {r.title || `Recording ${dt.toLocaleString()}`}
                  </h3>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 text-xs text-white/60">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={12} /> {dt.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={12} /> {formatDuration(r.durationSec)}
                  </span>
                  <span className="font-mono text-white/40">room {r.roomId.slice(0, 10)}…</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {r.fileUrl ? (
                    <>
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener"
                        className="hero-quick-link hero-quick-link-gold"
                      >
                        <ExternalLink size={14} /> Watch
                      </a>
                      <a
                        href={r.fileUrl}
                        download
                        className="hero-quick-link"
                      >
                        <Download size={14} /> Download
                      </a>
                    </>
                  ) : (
                    <span className="text-xs text-white/40 italic">
                      {r.status === 'recording' || r.status === 'starting'
                        ? 'In progress…'
                        : 'File pending — webhook not yet received'}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default function RecordingsPageGated() {
  return (
    <PermissionGate resource="recordings" action="view">
      <RecordingsPage />
    </PermissionGate>
  );
}
