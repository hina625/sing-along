'use client';

import { planslist } from '@/constants';
import { subscriptionContext } from '@/providers/SubscriptionProvider';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
} from 'chart.js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic2, Briefcase, HandHeart, Calendar, Disc, Radio, Clock, DollarSign, Users, CheckCircle2, Sparkles, ArrowRight, UserPlus, Video } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';
import { ThemeContext } from '@/providers/ThemeProvider';
import DailyVerseCard from '@/components/DailyVerseCard';
import Loader from '@/components/Loader';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
);

function daysLeftUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface Stats {
  totals: { sessions: number; recordings: number; prayers: number; donationsCount: number; donationsAmount: number };
  live: { count: number };
  upcoming: { count: number; next: { room_id: string; scheduleTime: string; description: string | null } | null };
  prayerBreakdown: { pending: number; prayed: number; archived: number };
  sessionsSeries: { date: string; count: number }[];
  donationsSeries: { date: string; amount: number }[];
}

const DashboardPage = () => {
  const { subscription, details } = useContext(subscriptionContext);
  const { activeWorkspace, loading: workspaceLoading } = useContext(WorkspaceContext);
  const { theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [starting, setStarting] = useState<'worship' | 'meeting' | 'gathering' | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        setStatsLoading(true);
        const params = new URLSearchParams({ host_user_id: user.id, days: '30' });
        if (activeWorkspace?._id) params.set('workspace_id', activeWorkspace._id);
        const res = await axios.get(`/api/v1/dashboard-stats?${params.toString()}`);
        if (res.data?.success) setStats(res.data);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setStatsLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user?.id, activeWorkspace?._id]);

  const startSession = async (kind: 'worship' | 'meeting' | 'gathering') => {
    if (!user || starting) return;
    setStarting(kind);
    // Room mode follows the workspace mode so the in-meeting toolset matches
    // what the user picked in Settings. Mirrors the server's
    // deriveModeFromWorkspace() in app/api/v1/create-room/route.js — keep in sync.
    // Without this, a worship/"Organizations & Networks" workspace would still
    // get a business-mode room (and a whiteboard) just because the dashboard
    // button is labeled "Start Meeting".
    const wsMode = activeWorkspace?.mode;
    const roomMode =
      wsMode === 'business'
        ? 'business'
        : wsMode === 'community' || wsMode === 'hybrid'
        ? 'hybrid'
        : 'worship';
    try {
      const id = crypto.randomUUID();
      const minutes = planslist[subscription]?.min || 40;
      const end_time = new Date(Date.now() + minutes * 60 * 1000).toUTCString();
      const res = await axios.post('/api/v1/create-room', {
        user_id: user.id,
        workspaceId: activeWorkspace?._id || null,
        mode: roomMode,
        room_id: id,
        user_plan: subscription,
        start_time: new Date().toUTCString(),
        end_time,
        status: 'private',
      });
      if (res.data?.success) {
        router.push(`/dashboard/beforemeet/${id}`);
      } else {
        throw new Error('Could not create session');
      }
    } catch (e: any) {
      setStarting(null);
      // axios puts the server's JSON error body at e.response.data — surface the
      // upgrade message directly when the server returns 402 (plan-cap hit).
      const serverMsg = e?.response?.data?.message;
      toast({
        title: kind === 'worship' ? 'Could not start worship' : kind === 'gathering' ? 'Could not start gathering' : 'Could not start meeting',
        description: serverMsg || e?.message || 'Try again.',
      });
    }
  };

  // ---- Chart datasets ----
  const sessionsChart = useMemo(() => {
    const labels = stats?.sessionsSeries.map((p) =>
      new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    ) || [];
    return {
      labels,
      datasets: [
        {
          label: 'Sessions',
          data: stats?.sessionsSeries.map((p) => p.count) || [],
          backgroundColor: 'rgba(90, 45, 130, 0.55)',
          borderColor: '#D4AF37',
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    };
  }, [stats]);

  const donationsChart = useMemo(() => {
    const labels = stats?.donationsSeries.map((p) =>
      new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    ) || [];
    return {
      labels,
      datasets: [
        {
          label: 'Contributions ($)',
          data: stats?.donationsSeries.map((p) => p.amount) || [],
          fill: true,
          backgroundColor: 'rgba(245, 124, 0, 0.18)',
          borderColor: '#F57C00',
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#D4AF37',
        },
      ],
    };
  }, [stats]);

  const prayerPie = useMemo(() => ({
    labels: ['Pending', 'Supported', 'Archived'],
    datasets: [
      {
        data: [
          stats?.prayerBreakdown.pending || 0,
          stats?.prayerBreakdown.prayed || 0,
          stats?.prayerBreakdown.archived || 0,
        ],
        backgroundColor: ['#F57C00', '#5A2D82', 'rgba(255,255,255,0.18)'],
        borderColor: '#0A0A0A',
        borderWidth: 2,
      },
    ],
  }), [stats]);

  const labelColor = isLight ? 'rgba(11, 31, 58, 0.78)' : 'rgba(255, 255, 255, 0.75)';
  const tickColor  = isLight ? 'rgba(11, 31, 58, 0.60)' : 'rgba(255, 255, 255, 0.55)';
  const gridColor  = isLight ? 'rgba(11, 31, 58, 0.10)' : 'rgba(255, 255, 255, 0.05)';

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: labelColor } },
    },
    scales: {
      x: { ticks: { color: tickColor }, grid: { color: gridColor } },
      y: {
        ticks: { color: tickColor, precision: 0 },
        grid: { color: gridColor },
        beginAtZero: true,
      },
    },
  } as const;

  const pieOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { color: labelColor } } },
  };

  // Hold the dashboard until the workspace resolves — otherwise business users
  // see a flash of the worship-themed default before their real mode renders.
  if (workspaceLoading || !activeWorkspace) {
    return <Loader />;
  }

  // Mode-aware copy: business → team-meeting framing, community → blended
  // framing, worship/hybrid → neutral default (no religion-specific phrasing).
  const wsMode = activeWorkspace.mode;
  const isBusinessWs = wsMode === 'business';
  const isCommunityWs = wsMode === 'community';

  // New free users (free plan, zero sessions logged) see a guided onboarding
  // instead of empty stat tiles + charts + an upfront upgrade tile.
  const isNewFreeUser =
    subscription === 'free' && !statsLoading && (stats?.totals.sessions ?? 0) === 0;
  const freePlan = planslist.free;

  const heroCopy = isBusinessWs
    ? {
        eyebrow: 'Go Live',
        headline: 'Get your team in the room',
        subline: 'One click to open a meeting with notes, files, whiteboard, and recording.',
      }
    : isCommunityWs
    ? {
        eyebrow: 'Go Live',
        headline: 'Bring your community together',
        subline: 'One click to open a gathering with notes, files, whiteboard, recording, and contributions — everything your community needs in one room.',
      }
    : {
        eyebrow: 'Go Live',
        headline: 'Start a meeting',
        subline: 'One click to open a room with notes, files, whiteboard, and recording — everything your group needs in one place.',
      };

  const welcomeSub = isBusinessWs
    ? 'Built for the way your team actually meets.'
    : isCommunityWs
    ? 'One space for your community and the work that keeps it running.'
    : 'Your meetings, recordings, and contributions — all in one place.';

  return (
    <section className="flex size-full flex-col gap-8 text-white pb-12">
      {/* Welcome */}
      <div className="dash-welcome flex flex-col mx-auto w-full max-w-6xl px-4">
        <h2 className="dash-welcome-title text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
          Welcome{user?.firstName ? <>, <span className="dash-welcome-name">{user.firstName}</span></> : ''}
        </h2>
        <p className="dash-welcome-sub mt-1 text-sm md:text-base">
          {welcomeSub}
        </p>
      </div>

      {/* Hero CTA */}
      <div className="relative mx-auto w-full max-w-6xl px-4">
        <div className="hero-cta-wrap hero-cta-compact relative overflow-hidden rounded-2xl p-5 sm:p-6">
          <div className="light-ray-container" aria-hidden />
          <div className="relative z-10 flex flex-col items-center gap-3 text-center">
            <p className="text-deep-gold uppercase tracking-[0.25em] text-[10px] sm:text-xs font-semibold">{heroCopy.eyebrow}</p>
            <h3 className="text-white text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
              {heroCopy.headline}
            </h3>
            <p className="text-white/65 max-w-xl text-xs sm:text-sm">
              {heroCopy.subline}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-1">
              {/* Primary CTA: business → meeting, community → gathering (both toolsets), worship → worship + meeting. */}
              {isBusinessWs ? (
                <button type="button" onClick={() => startSession('meeting')} disabled={!!starting} className="hero-start-worship">
                  <Briefcase size={22} className="shrink-0" />
                  <span>{starting === 'meeting' ? 'Opening meeting…' : 'Start Meeting'}</span>
                </button>
              ) : isCommunityWs ? (
                <button type="button" onClick={() => startSession('gathering')} disabled={!!starting} className="hero-start-worship">
                  <Users size={22} className="shrink-0" />
                  <span>{starting === 'gathering' ? 'Opening gathering…' : 'Start Gathering'}</span>
                </button>
              ) : (
                <button type="button" onClick={() => startSession('meeting')} disabled={!!starting} className="hero-start-worship">
                  <Briefcase size={22} className="shrink-0" />
                  <span>{starting === 'meeting' ? 'Opening meeting…' : 'Start Meeting'}</span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <Link href="/dashboard/upcoming" className="hero-quick-link">
                <Calendar size={16} /> {isCommunityWs ? 'Schedule Gathering' : 'Schedule Meeting'}
              </Link>
              {!isBusinessWs && (
                <Link href="/donate" className="hero-quick-link hero-quick-link-gold">
                  <HandHeart size={16} /> Contribute
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === Daily Verse — opt-in: only renders if the workspace has curated verses. === */}
      {(activeWorkspace?.mode !== 'business') && <DailyVerseCard />}

      {/* === New-free-user onboarding === */}
      {isNewFreeUser && (
        <OnboardingPanel
          isBusinessWs={isBusinessWs}
          isCommunityWs={isCommunityWs}
          freeFeatures={freePlan?.features || []}
          freeTitle={freePlan?.title || 'Starter'}
        />
      )}

      {/* === Live stats grid === */}
      {!isNewFreeUser && (
      <div className="px-4 max-w-6xl mx-auto w-full">
        <div className="dash-stats-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile
            icon={<Radio size={18} />}
            label="Live now"
            value={stats?.live.count ?? '—'}
            tone="red"
            loading={statsLoading}
          />
          <StatTile
            icon={<Calendar size={18} />}
            label="Upcoming"
            value={stats?.upcoming.count ?? '—'}
            sub={stats?.upcoming.next ? new Date(stats.upcoming.next.scheduleTime).toLocaleDateString() : undefined}
            loading={statsLoading}
          />
          <StatTile icon={<Mic2 size={18} />} label="Total sessions" value={stats?.totals.sessions ?? '—'} loading={statsLoading} />
          <StatTile icon={<Disc size={18} />} label="Recordings" value={stats?.totals.recordings ?? '—'} loading={statsLoading} />
          {!isBusinessWs && (
            <StatTile icon={<HandHeart size={18} />} label="Requests" value={stats?.totals.prayers ?? '—'} loading={statsLoading} />
          )}
          {!isBusinessWs && (
            <StatTile
              icon={<DollarSign size={18} />}
              label="Contributions"
              value={stats ? `$${stats.totals.donationsAmount.toLocaleString()}` : '—'}
              sub={stats ? `${stats.totals.donationsCount} contributions` : undefined}
              tone="gold"
              loading={statsLoading}
            />
          )}
        </div>
      </div>
      )}

      {/* === Charts === */}
      {!isNewFreeUser && (
      <div className="px-4 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`card-premium p-5 ${isBusinessWs ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <h4 className="text-deep-gold font-semibold mb-2">Sessions — last 30 days</h4>
          <div className="h-[260px]">
            <Bar data={sessionsChart} options={chartOpts} />
          </div>
        </div>
        {!isBusinessWs && (
          <div className="card-premium p-5">
            <h4 className="text-deep-gold font-semibold mb-2">Requests</h4>
            <div className="h-[260px] flex items-center justify-center">
              {(stats?.totals.prayers || 0) === 0 ? (
                <p className="text-white/50 text-sm">No requests yet.</p>
              ) : (
                <Pie data={prayerPie} options={pieOpts} />
              )}
            </div>
          </div>
        )}
        {!isBusinessWs && (
          <div className="card-premium p-5 lg:col-span-3">
            <h4 className="text-deep-gold font-semibold mb-2">Contributions — last 30 days</h4>
            <div className="h-[240px]">
              <Line data={donationsChart} options={chartOpts} />
            </div>
          </div>
        )}
      </div>
      )}

      {/* === Plan info — hidden during onboarding; replaced by the bottom "Want more?" card. === */}
      {!isNewFreeUser && (
      <div className="dash-plan-grid px-4 max-w-6xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-premium p-5 flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-white/55">Current plan</span>
          <span className="text-2xl font-bold capitalize">{subscription}</span>
          {subscription === 'free' && (
            <Link href="/plans" className="hero-quick-link hero-quick-link-gold mt-2 self-start">
              Upgrade now
            </Link>
          )}
        </div>
        <div className="card-premium p-5 flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-white/55">Meeting duration</span>
          <span className="text-2xl font-bold">
            {planslist[subscription]?.min}<span className="text-base text-white/55"> min</span>
          </span>
        </div>
        {subscription !== 'free' && (
          <div className="card-premium p-5 flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wider text-white/55">Days left</span>
            <span className="text-2xl font-bold">
              {details?.subscription_expire ? daysLeftUntil(details.subscription_expire) : 0}
            </span>
          </div>
        )}
        {subscription !== 'free' && details?.subscribe_start && (
          <div className="card-premium p-5 flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wider text-white/55">Subscription</span>
            <span className="text-sm font-medium">
              {new Date(details.subscribe_start).toLocaleDateString()} → {new Date(details.subscription_expire).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
      )}

      {/* === "Want more?" — single quiet upgrade nudge for free users, no prices on dash. === */}
      {subscription === 'free' && (
        <div className="px-4 max-w-6xl mx-auto w-full">
          <Link
            href="/plans"
            className="card-premium p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:no-underline"
          >
            <div className="flex flex-col gap-1">
              <span className="text-deep-gold uppercase tracking-[0.25em] text-[10px] font-semibold flex items-center gap-1.5">
                <Sparkles size={12} /> Want more?
              </span>
              <span className="text-white text-base sm:text-lg font-semibold">
                Unlock recording, unlimited duration, and more.
              </span>
              <span className="text-white/55 text-xs sm:text-sm">
                See what each plan includes — no card details on this page.
              </span>
            </div>
            <span className="hero-quick-link hero-quick-link-gold self-start sm:self-auto">
              Explore plans <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      )}
    </section>
  );
};

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  tone?: 'default' | 'gold' | 'red';
  loading?: boolean;
}

const StatTile = ({ icon, label, value, sub, tone = 'default', loading }: StatTileProps) => {
  const accent =
    tone === 'gold' ? 'text-deep-gold' :
    tone === 'red'  ? 'text-[#ea4335]' :
    'text-white/85';
  return (
    <div className="card-premium p-4 flex flex-col gap-2 min-h-[110px]">
      <div className={`flex items-center gap-2 text-xs uppercase tracking-wider ${accent}`}>
        {icon}<span>{label}</span>
      </div>
      <div className="text-2xl font-bold leading-none">
        {loading ? <span className="opacity-40">…</span> : value}
      </div>
      {sub && <div className="text-[11px] text-white/45">{sub}</div>}
    </div>
  );
};

interface OnboardingPanelProps {
  isBusinessWs: boolean;
  isCommunityWs: boolean;
  freeFeatures: string[];
  freeTitle: string;
}

const OnboardingPanel = ({ isBusinessWs, isCommunityWs, freeFeatures, freeTitle }: OnboardingPanelProps) => {
  const sessionWord = isBusinessWs ? 'meeting' : isCommunityWs ? 'gathering' : 'session';
  const inviteWord = isBusinessWs ? 'teammates' : isCommunityWs ? 'community' : 'people';

  const steps = [
    {
      icon: <Video size={18} />,
      title: `Start your first ${sessionWord}`,
      body: 'Tap "Go Live" above to open a room with notes, files, and whiteboard.',
      href: null,
      cta: null,
    },
    {
      icon: <UserPlus size={18} />,
      title: `Invite your ${inviteWord}`,
      body: 'Share an invite link or add members from the Team page.',
      href: '/dashboard/members',
      cta: 'Open Team',
    },
    {
      icon: <Calendar size={18} />,
      title: `Schedule a ${sessionWord}`,
      body: 'Plan ahead — set a time and we\'ll send reminders.',
      href: '/dashboard/upcoming',
      cta: 'Schedule one',
    },
  ];

  return (
    <div className="px-4 max-w-6xl mx-auto w-full flex flex-col gap-4">
      {/* Getting started checklist */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-deep-gold" />
          <h4 className="text-deep-gold font-semibold text-sm uppercase tracking-[0.2em]">Getting started</h4>
        </div>
        <ol className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 sm:gap-4">
              <span className="shrink-0 w-7 h-7 rounded-full border border-white/15 flex items-center justify-center text-white/80 text-sm font-semibold">
                {i + 1}
              </span>
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="text-deep-gold mt-0.5">{step.icon}</span>
                  <div>
                    <p className="text-white text-sm font-semibold">{step.title}</p>
                    <p className="text-white/55 text-xs mt-0.5">{step.body}</p>
                  </div>
                </div>
                {step.href && (
                  <Link href={step.href} className="hero-quick-link self-start sm:self-auto shrink-0">
                    {step.cta} <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* What's included on Free */}
      <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h4 className="text-deep-gold font-semibold text-sm uppercase tracking-[0.2em]">
            What’s included in {freeTitle} (Free)
          </h4>
          <span className="text-white/45 text-[11px]">No credit card needed</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {freeFeatures.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/80">
              <CheckCircle2 size={16} className="text-deep-gold shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DashboardPage;
