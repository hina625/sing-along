'use client';

import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { DollarSign, Repeat, Users, TrendingUp, RefreshCw, Trash2 } from 'lucide-react';
import Loader from '@/components/Loader';
import PermissionGate from '@/components/PermissionGate';
import { useToast } from '@/components/ui/use-toast';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, Filler);

interface DonationRow {
  _id: string;
  transactionId: string | null;
  subscriptionId: string | null;
  isRecurring: boolean;
  frequency: 'weekly' | 'monthly' | 'yearly' | null;
  donorUserId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';
  timestamp: string;
  nextChargeDate: string | null;
}

interface DonationReports {
  summary: {
    total: number; count: number;
    monthTotal: number; monthCount: number;
    recurringActive: number; recurringMonthlyValue: number;
  };
  trend: { date: string; amount: number }[];
  recurring: DonationRow[];
  recent: DonationRow[];
  topDonors: { donor: string; email: string | null; total: number; count: number }[];
  byFrequency: { weekly: number; monthly: number; yearly: number; oneTime: number };
}

const STATUS_BADGE: Record<DonationRow['status'], { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-amber-500/15 text-amber-300' },
  succeeded: { label: 'Succeeded', cls: 'bg-green-500/15 text-green-300' },
  failed:    { label: 'Failed',    cls: 'bg-red-500/15 text-red-300' },
  refunded:  { label: 'Refunded',  cls: 'bg-white/10 text-white/70' },
  cancelled: { label: 'Cancelled', cls: 'bg-white/5 text-white/50' },
};

const formatMoney = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const DonationsPage = () => {
  const { user, isLoaded } = useUser();
  const { activeWorkspace, can } = useContext(WorkspaceContext);
  const canManage = can('donations', 'manage');
  const { toast } = useToast();
  const [data, setData] = useState<DonationReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ host_user_id: user.id, days: '90' });
      if (activeWorkspace?._id) params.set('workspace_id', activeWorkspace._id);
      const res = await axios.get(`/api/v1/donations?${params.toString()}`);
      if (res.data?.success) setData(res.data);
    } catch (err) {
      console.error('Failed to load donation reports', err);
      toast({ title: 'Could not load donation reports', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeWorkspace?._id, toast]);

  useEffect(() => { if (isLoaded) fetchReports(); }, [isLoaded, fetchReports]);

  const cancelRecurring = async (row: DonationRow) => {
    if (!row.subscriptionId || !user?.id) return;
    if (typeof window !== 'undefined' && !window.confirm(`Cancel this ${row.frequency} partnership of $${row.amount}? Future charges will stop.`)) return;
    setCancellingId(row._id);
    try {
      const res = await axios.delete('/api/v1/donate/recurring', {
        data: { subscriptionId: row.subscriptionId, donorUserId: user.id },
      });
      if (res.data?.success) {
        toast({ title: 'Recurring partnership cancelled', description: 'No future charges will be made.' });
        fetchReports();
      } else {
        throw new Error(res.data?.message || 'Cancel failed');
      }
    } catch (err: any) {
      toast({
        title: 'Could not cancel',
        description: err?.response?.data?.message || err?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const trendChart = useMemo(() => ({
    labels: data?.trend.map((p) => new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) || [],
    datasets: [{
      label: 'Contributions ($)',
      data: data?.trend.map((p) => p.amount) || [],
      fill: true,
      backgroundColor: 'rgba(245, 124, 0, 0.18)',
      borderColor: '#F57C00',
      tension: 0.35,
      pointRadius: 3,
      pointBackgroundColor: '#D4AF37',
    }],
  }), [data]);

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: 'rgba(255,255,255,0.75)' } } },
    scales: {
      x: { ticks: { color: 'rgba(255,255,255,0.55)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: 'rgba(255,255,255,0.55)' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
    },
  } as const;

  if (!isLoaded) return <Loader />;

  return (
    <section className="flex size-full flex-col gap-6 text-white pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4 mt-24">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <DollarSign className="text-deep-gold" size={32} />
            Partner with Us
          </h2>
          <p className="text-white/60 mt-2 italic text-sm">
            Partner contributions across <strong>{activeWorkspace?.name || 'your workspace'}</strong>.
          </p>
        </div>
        <button type="button" onClick={fetchReports} className="hero-quick-link" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && !data ? <Loader /> : !data ? (
        <div className="card-premium p-10 text-center text-white/60">No data yet.</div>
      ) : (
        <>
          {/* === KPI tiles === */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile icon={<DollarSign size={18} />} label="Total received" value={formatMoney(data.summary.total)} sub={`${data.summary.count} contribution${data.summary.count === 1 ? '' : 's'}`} tone="gold" />
            <KpiTile icon={<TrendingUp size={18} />} label="This month" value={formatMoney(data.summary.monthTotal)} sub={`${data.summary.monthCount} contribution${data.summary.monthCount === 1 ? '' : 's'}`} />
            <KpiTile icon={<Repeat size={18} />} label="Active recurring" value={String(data.summary.recurringActive)} sub={data.summary.recurringActive === 1 ? '1 subscription' : `${data.summary.recurringActive} subscriptions`} />
            <KpiTile icon={<TrendingUp size={18} />} label="Recurring / month" value={formatMoney(data.summary.recurringMonthlyValue)} sub="MRR equivalent" tone="gold" />
          </div>

          {/* === Trend chart === */}
          <div className="card-premium p-5">
            <h4 className="text-deep-gold font-semibold mb-2">Contributions — last 90 days</h4>
            <div className="h-[260px]">
              <Line data={trendChart} options={chartOpts} />
            </div>
          </div>

          {/* === Active recurring subscriptions === */}
          <div className="card-premium p-5">
            <h4 className="text-deep-gold font-semibold mb-3 flex items-center gap-2">
              <Repeat size={18} /> Active recurring partnerships
            </h4>
            {data.recurring.length === 0 ? (
              <p className="text-white/50 text-sm italic">No active recurring partnerships yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.recurring.map((row) => (
                  <li key={row._id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex flex-col min-w-0">
                      <span className="text-white font-semibold">
                        {`${row.firstName} ${row.lastName}`.trim() || row.email || 'Anonymous'}
                      </span>
                      <span className="text-xs text-white/55">
                        {formatMoney(row.amount)} / {row.frequency} · started {new Date(row.timestamp).toLocaleDateString()}
                        {row.nextChargeDate && ` · next ${new Date(row.nextChargeDate).toLocaleDateString()}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold ${STATUS_BADGE[row.status].cls}`}>
                        {STATUS_BADGE[row.status].label}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => cancelRecurring(row)}
                          disabled={cancellingId === row._id}
                          title="Cancel subscription"
                          className="p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* === Two-up: top donors + recent transactions === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-premium p-5">
              <h4 className="text-deep-gold font-semibold mb-3 flex items-center gap-2">
                <Users size={18} /> Top partners
              </h4>
              {data.topDonors.length === 0 ? (
                <p className="text-white/50 text-sm italic">No partners yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.topDonors.map((d, i) => (
                    <li key={`${d.email || d.donor}-${i}`} className="flex items-center justify-between p-2 rounded-md hover:bg-white/5 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-deep-gold font-bold w-5 text-right">{i + 1}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-white truncate">{d.donor}</span>
                          {d.email && <span className="text-[11px] text-white/45 truncate">{d.email}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-deep-gold font-semibold">{formatMoney(d.total)}</span>
                        <span className="text-[10px] text-white/45">{d.count} contribution{d.count === 1 ? '' : 's'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card-premium p-5">
              <h4 className="text-deep-gold font-semibold mb-3">Recent contributions</h4>
              {data.recent.length === 0 ? (
                <p className="text-white/50 text-sm italic">No contributions yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto">
                  {data.recent.map((row) => (
                    <li key={row._id} className="flex items-center justify-between p-2 rounded-md hover:bg-white/5 transition text-sm">
                      <div className="flex flex-col min-w-0">
                        <span className="text-white truncate">{`${row.firstName} ${row.lastName}`.trim() || row.email || 'Anonymous'}</span>
                        <span className="text-[11px] text-white/45">
                          {new Date(row.timestamp).toLocaleString()}{row.isRecurring && ` · ${row.frequency}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-white font-semibold">{formatMoney(row.amount)}</span>
                        <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold ${STATUS_BADGE[row.status].cls}`}>
                          {STATUS_BADGE[row.status].label}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

interface KpiTileProps { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: 'gold' | 'default' }
const KpiTile = ({ icon, label, value, sub, tone = 'default' }: KpiTileProps) => {
  const accent = tone === 'gold' ? 'text-deep-gold' : 'text-white/85';
  return (
    <div className="card-premium p-4 flex flex-col gap-2 min-h-[110px]">
      <div className={`flex items-center gap-2 text-xs uppercase tracking-wider ${accent}`}>
        {icon}<span>{label}</span>
      </div>
      <div className="text-2xl font-bold leading-none">{value}</div>
      {sub && <div className="text-[11px] text-white/45">{sub}</div>}
    </div>
  );
};

export default function DonationsPageGated() {
  return (
    <PermissionGate resource="donations" action="view">
      <DonationsPage />
    </PermissionGate>
  );
}
