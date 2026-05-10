'use client';

import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Check, Archive, RefreshCw, Lock, Globe, HandHeart, Heart } from 'lucide-react';
import Loader from '@/components/Loader';
import PermissionGate from '@/components/PermissionGate';
import { useToast } from '@/components/ui/use-toast';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';

type Status = 'pending' | 'prayed' | 'archived';
type Visibility = 'public' | 'private' | 'all';

interface PrayerRequest {
  _id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  visibility: 'public' | 'private';
  status: Status;
  timestamp: string;
  prayedBy?: string[];
}

const STATUS_TABS: { key: Status; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'prayed', label: 'Prayed' },
  { key: 'archived', label: 'Archived' },
];

const PrayerRequestsPage = () => {
  const { user, isLoaded } = useUser();
  const { activeWorkspace, can } = useContext(WorkspaceContext);
  const canManage = can('prayerRequests', 'manage');
  const { toast } = useToast();
  const [tab, setTab] = useState<Status>('pending');
  const [visibility, setVisibility] = useState<Visibility>('all');
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        host_user_id: user.id,
        visibility,
        limit: '200',
      });
      // The "Prayed" tab is per-user — show only prayers this user has lifted up.
      // Pending / Archived stay tied to the global status.
      if (tab === 'prayed') {
        params.set('prayed_by', user.id);
      } else {
        params.set('status', tab);
      }
      if (activeWorkspace?._id) params.set('workspace_id', activeWorkspace._id);
      const res = await axios.get(`/api/v1/prayer-request?${params.toString()}`);
      if (res.data?.success) {
        setRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load prayer requests', err);
      toast({ title: 'Could not load prayer requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeWorkspace?._id, tab, visibility, toast]);

  useEffect(() => {
    if (isLoaded) fetchRequests();
  }, [isLoaded, fetchRequests]);

  // Light polling so newly-submitted requests show up without manual refresh.
  useEffect(() => {
    if (!isLoaded) return;
    const t = setInterval(fetchRequests, 15000);
    return () => clearInterval(t);
  }, [isLoaded, fetchRequests]);

  const togglePray = async (req: PrayerRequest) => {
    if (!user?.id) return;
    // Optimistic — flip locally immediately so the heart fills without a roundtrip lag.
    const isPraying = (req.prayedBy || []).includes(user.id);
    setRequests((cur) => cur.map((r) => {
      if (r._id !== req._id) return r;
      const next = isPraying
        ? (r.prayedBy || []).filter((u) => u !== user.id)
        : [...(r.prayedBy || []), user.id];
      return { ...r, prayedBy: next };
    }));
    try {
      const res = await axios.patch('/api/v1/prayer-request', {
        id: req._id,
        action: 'togglePray',
        user_id: user.id,
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed');
      // Sync to server's truth.
      const serverPrayedBy: string[] = res.data.request?.prayedBy || [];
      const nowPraying: boolean = !!res.data.praying;
      setRequests((cur) => {
        // On the Prayed tab, drop the row when the user un-prays — it no longer
        // belongs in that filter.
        if (tab === 'prayed' && !nowPraying) {
          return cur.filter((r) => r._id !== req._id);
        }
        return cur.map((r) => (r._id === req._id ? { ...r, prayedBy: serverPrayedBy } : r));
      });
    } catch (err) {
      // Roll back on failure.
      setRequests((cur) => cur.map((r) => {
        if (r._id !== req._id) return r;
        return { ...r, prayedBy: req.prayedBy || [] };
      }));
      toast({ title: 'Could not record your prayer', variant: 'destructive' });
    }
  };

  const updateStatus = async (id: string, status: Status) => {
    if (!user?.id) return;
    setBusyId(id);
    try {
      const res = await axios.patch('/api/v1/prayer-request', { id, status, user_id: user.id });
      if (res.data?.success) {
        setRequests((cur) => cur.filter((r) => r._id !== id));
        toast({
          title: status === 'prayed' ? '🙏 Marked as prayed' : status === 'archived' ? 'Archived' : 'Restored',
          className: 'bg-white/10 border-none text-white',
        });
      }
    } catch (err) {
      toast({ title: 'Could not update prayer', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => ({
    total: requests.length,
    publicCount: requests.filter((r) => r.visibility === 'public').length,
    privateCount: requests.filter((r) => r.visibility === 'private').length,
  }), [requests]);

  if (!isLoaded) return <Loader />;

  return (
    <section className="flex size-full flex-col gap-6 text-white pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4 mt-24">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <HandHeart className="text-deep-gold" size={32} />
            Prayer Requests
          </h2>
          <p className="text-white/60 mt-2 italic text-sm">
            "Pray for one another, that you may be healed." — James 5:16
          </p>
        </div>
        <button
          type="button"
          onClick={fetchRequests}
          className="hero-quick-link"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-gradient-to-r from-royal-purple to-deep-gold text-white shadow-md'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {(['all', 'public', 'private'] as Visibility[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wide font-semibold transition-all ${
                visibility === v
                  ? 'bg-deep-gold/20 text-deep-gold border border-deep-gold/40'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs text-white/50">
        {counts.total} request{counts.total === 1 ? '' : 's'} · {counts.publicCount} public · {counts.privateCount} private
      </div>

      {/* List */}
      {loading && requests.length === 0 ? (
        <Loader />
      ) : requests.length === 0 ? (
        <div className="card-premium p-10 text-center text-white/60">
          <HandHeart size={40} className="mx-auto mb-4 text-deep-gold/60" />
          {tab === 'prayed' ? (
            <>
              <p className="text-lg">You haven&apos;t prayed for any requests yet.</p>
              <p className="text-sm mt-2">Open the Pending tab and tap “Pray for this” to add one here.</p>
            </>
          ) : (
            <>
              <p className="text-lg">No {tab} prayer requests.</p>
              <p className="text-sm mt-2">When someone submits a prayer in worship, it will appear here.</p>
            </>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => {
            const dt = new Date(r.timestamp);
            return (
              <li
                key={r._id}
                className="card-premium p-5 flex flex-col sm:flex-row gap-4 sm:items-start"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
                    <span className="font-semibold text-white/80">{r.senderName}</span>
                    <span>·</span>
                    <span>{dt.toLocaleString()}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      {r.visibility === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                      {r.visibility}
                    </span>
                    <span>·</span>
                    <span className="font-mono text-white/40">room {r.roomId.slice(0, 8)}…</span>
                  </div>
                  <p className="text-white whitespace-pre-wrap leading-relaxed">{r.content}</p>

                  {(() => {
                    const prayedBy = r.prayedBy || [];
                    const meIsPraying = !!user?.id && prayedBy.includes(user.id);
                    const count = prayedBy.length;
                    return (
                      <button
                        type="button"
                        onClick={() => togglePray(r)}
                        className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                          meIsPraying
                            ? 'bg-rose-500/15 border-rose-400/40 text-rose-200 hover:bg-rose-500/25'
                            : 'bg-white/5 border-white/15 text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                        title={meIsPraying ? 'You are praying for this' : 'Mark that you prayed for this'}
                      >
                        <Heart
                          size={14}
                          className={meIsPraying ? 'fill-rose-400 text-rose-400' : ''}
                        />
                        {meIsPraying ? 'Praying' : 'Pray for this'}
                        {count > 0 && (
                          <span className="text-xs text-white/55 font-normal">· {count}</span>
                        )}
                      </button>
                    );
                  })()}
                </div>
                {canManage && (
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    {tab !== 'prayed' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(r._id, 'prayed')}
                        disabled={busyId === r._id}
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-royal-purple to-deep-gold text-white text-sm font-semibold flex items-center gap-2 hover:brightness-110 transition disabled:opacity-50"
                      >
                        <Check size={16} /> Prayed
                      </button>
                    )}
                    {tab !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(r._id, 'archived')}
                        disabled={busyId === r._id}
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm flex items-center gap-2 hover:bg-white/10 transition disabled:opacity-50"
                      >
                        <Archive size={16} /> Archive
                      </button>
                    )}
                    {tab === 'archived' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(r._id, 'pending')}
                        disabled={busyId === r._id}
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm flex items-center gap-2 hover:bg-white/10 transition disabled:opacity-50"
                      >
                        <RefreshCw size={16} /> Restore
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default function PrayerRequestsPageGated() {
  return (
    <PermissionGate resource="prayerRequests" action="view">
      <PrayerRequestsPage />
    </PermissionGate>
  );
}
