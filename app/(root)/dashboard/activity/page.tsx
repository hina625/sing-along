'use client';

import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import Link from 'next/link';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import Loader from '@/components/Loader';
import PermissionGate from '@/components/PermissionGate';
import { useToast } from '@/components/ui/use-toast';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';

type EventType =
  | 'session.started' | 'session.scheduled'
  | 'recording.started' | 'recording.ready' | 'recording.failed'
  | 'note.added' | 'prayer.new' | 'donation.received' | 'file.shared';

interface Event {
  type: EventType;
  ts: string;
  actor: string | null;
  title: string;
  body?: string | null;
  link?: string;
  icon: string;
  severity?: 'warn';
}

const TYPE_LABEL: Record<EventType, string> = {
  'session.started':   'Session',
  'session.scheduled': 'Schedule',
  'recording.started': 'Recording',
  'recording.ready':   'Recording',
  'recording.failed':  'Recording',
  'note.added':        'Note',
  'prayer.new':        'Prayer',
  'donation.received': 'Gift',
  'file.shared':       'File',
};

const formatRelative = (iso: string) => {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
};

// Group events by day for a clean timeline.
const dayKey = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
};

const FILTERS: { key: 'all' | EventType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'session.started', label: 'Sessions' },
  { key: 'recording.ready', label: 'Recordings' },
  { key: 'note.added', label: 'Notes' },
  { key: 'prayer.new', label: 'Prayers' },
  { key: 'donation.received', label: 'Gifts' },
  { key: 'file.shared', label: 'Files' },
];

const ActivityPage = () => {
  const { user, isLoaded } = useUser();
  const { activeWorkspace } = useContext(WorkspaceContext);
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<'all' | EventType>('all');
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ host_user_id: user.id, limit: '120' });
      if (activeWorkspace?._id) params.set('workspace_id', activeWorkspace._id);
      const res = await axios.get(`/api/v1/activity?${params.toString()}`);
      if (res.data?.success) setEvents(res.data.events || []);
    } catch (err) {
      console.error('Failed to load activity', err);
      toast({ title: 'Could not load activity', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeWorkspace?._id, toast]);

  useEffect(() => { if (isLoaded) fetchActivity(); }, [isLoaded, fetchActivity]);

  // Light auto-refresh.
  useEffect(() => {
    if (!isLoaded) return;
    const t = setInterval(fetchActivity, 30000);
    return () => clearInterval(t);
  }, [isLoaded, fetchActivity]);

  const filtered = useMemo(() => {
    if (filter === 'all') return events;
    // Some filters group by family — match prefix.
    if (filter === 'recording.ready') return events.filter((e) => e.type.startsWith('recording.'));
    if (filter === 'session.started') return events.filter((e) => e.type.startsWith('session.'));
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of filtered) {
      const k = dayKey(e.ts);
      const arr = map.get(k) || [];
      arr.push(e);
      map.set(k, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (!isLoaded) return <Loader />;

  return (
    <section className="flex size-full flex-col gap-6 text-white pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4 mt-24">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <Activity className="text-deep-gold" size={32} />
            Team Activity
          </h2>
          <p className="text-white/60 mt-2 italic text-sm">
            Everything that's happened across <strong>{activeWorkspace?.name || 'your workspace'}</strong>.
          </p>
        </div>
        <button type="button" onClick={fetchActivity} className="hero-quick-link" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
              filter === f.key
                ? 'bg-gradient-to-r from-royal-purple to-deep-gold text-white shadow-md'
                : 'bg-white/5 text-white/65 hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading && events.length === 0 ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <div className="card-premium p-10 text-center text-white/60">
          <Activity size={40} className="mx-auto mb-4 text-deep-gold/60" />
          <p className="text-lg">No activity to show.</p>
          <p className="text-sm mt-2">As your team meets, records, prays, and gives, it'll appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([day, dayEvents]) => (
            <div key={day} className="flex flex-col gap-2">
              <h3 className="activity-day-heading">{day}</h3>
              <ul className="activity-list">
                {dayEvents.map((e, i) => {
                  const Inner = (
                    <>
                      <span className={`activity-icon ${e.severity === 'warn' ? 'is-warn' : ''}`} aria-hidden>{e.icon}</span>
                      <div className="activity-body">
                        <div className="activity-row">
                          <span className="activity-label">{TYPE_LABEL[e.type] || 'Event'}</span>
                          <span className="activity-time">{formatRelative(e.ts)}</span>
                        </div>
                        <div className="activity-title">{e.title}</div>
                        {e.body && <div className="activity-body-text">{e.body}</div>}
                      </div>
                    </>
                  );
                  if (e.link) {
                    return (
                      <li key={`${e.type}-${e.ts}-${i}`} className="activity-item-wrap">
                        <Link href={e.link} className="activity-item">{Inner}</Link>
                      </li>
                    );
                  }
                  return (
                    <li key={`${e.type}-${e.ts}-${i}`} className="activity-item-wrap">
                      <div className="activity-item activity-item-static">{Inner}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default function ActivityPageGated() {
  return (
    <PermissionGate resource="activity" action="view">
      <ActivityPage />
    </PermissionGate>
  );
}
