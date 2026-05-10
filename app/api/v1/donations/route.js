import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/connnectDB';
import donationModel from '@/lib/donationModel';
import { requirePermission } from '@/lib/permissions';

/**
 * Donation reports for the dashboard.
 *
 * GET /api/v1/donations?host_user_id=...&workspace_id=...&days=90
 *
 * Returns:
 *   summary: { total, count, monthTotal, monthCount, recurringActive, recurringMonthlyValue }
 *   trend:           [{ date, amount }]                  // last `days` days
 *   recurring:       [donation rows where isRecurring && status != cancelled]
 *   recent:          [donation rows]                     // last 50, newest first
 *   topDonors:       [{ donor, total, count }]           // top 10
 *   byFrequency:     { weekly, monthly, yearly, oneTime }
 */
export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const hostUserId = searchParams.get('host_user_id');
        const workspaceId = searchParams.get('workspace_id');
        const days = Math.min(Math.max(parseInt(searchParams.get('days') || '90', 10), 14), 365);

        if (!hostUserId && !workspaceId) {
            return NextResponse.json({ success: false, message: 'host_user_id or workspace_id is required' }, { status: 400 });
        }

        // Workspace-scoped donation reports require view permission.
        if (workspaceId && hostUserId) {
            const denied = await requirePermission({
                workspaceId, userId: hostUserId, resource: 'donations', action: 'view',
            });
            if (denied) return denied;
        }

        // Scope filter — workspace_id is the more accurate scope; donorUserId is *not*
        // the host (it's the giver). Per-host attribution will land when donations capture
        // hostUserId at give time. For now, workspace_id is the right key when present.
        const scope = {};
        if (workspaceId) scope.workspaceId = new mongoose.Types.ObjectId(workspaceId);

        const now = new Date();
        const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // ---- Aggregate totals (succeeded only) ----
        const [totalAgg, monthAgg] = await Promise.all([
            donationModel.aggregate([
                { $match: { ...scope, status: 'succeeded' } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]),
            donationModel.aggregate([
                { $match: { ...scope, status: 'succeeded', timestamp: { $gte: monthStart } } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]),
        ]);

        // ---- Active recurring subscriptions ----
        const recurringRows = await donationModel
            .find({ ...scope, isRecurring: true, status: { $in: ['pending', 'succeeded'] }, cancelledAt: null })
            .sort({ timestamp: -1 })
            .lean();

        // Monthly equivalent value for active subscriptions ("MRR" for the ministry).
        const recurringMonthlyValue = recurringRows.reduce((sum, r) => {
            if (r.frequency === 'weekly') return sum + (r.amount * 52) / 12;
            if (r.frequency === 'yearly') return sum + r.amount / 12;
            return sum + r.amount; // monthly
        }, 0);

        // ---- Recent transactions ----
        const recent = await donationModel
            .find(scope)
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        // ---- Top donors (by total amount) ----
        const topDonorsAgg = await donationModel.aggregate([
            { $match: { ...scope, status: 'succeeded' } },
            {
                $group: {
                    _id: { donorUserId: '$donorUserId', email: '$email' },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                    firstName: { $first: '$firstName' },
                    lastName: { $first: '$lastName' },
                },
            },
            { $sort: { total: -1 } },
            { $limit: 10 },
        ]);
        const topDonors = topDonorsAgg.map((d) => ({
            donor: `${d.firstName || ''} ${d.lastName || ''}`.trim() || d._id?.email || 'Anonymous',
            email: d._id?.email || null,
            total: d.total,
            count: d.count,
        }));

        // ---- Frequency breakdown ----
        const freqAgg = await donationModel.aggregate([
            { $match: { ...scope, status: { $in: ['succeeded', 'pending'] } } },
            {
                $group: {
                    _id: { isRecurring: '$isRecurring', frequency: '$frequency' },
                    count: { $sum: 1 },
                },
            },
        ]);
        const byFrequency = { weekly: 0, monthly: 0, yearly: 0, oneTime: 0 };
        for (const row of freqAgg) {
            if (!row._id.isRecurring) byFrequency.oneTime += row.count;
            else if (row._id.frequency === 'weekly') byFrequency.weekly += row.count;
            else if (row._id.frequency === 'yearly') byFrequency.yearly += row.count;
            else if (row._id.frequency === 'monthly') byFrequency.monthly += row.count;
        }

        // ---- Trend series (last `days` days, daily buckets) ----
        const dayKey = (d) => d.toISOString().slice(0, 10);
        const trendMap = new Map();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            trendMap.set(dayKey(d), 0);
        }
        const trendRows = await donationModel.find(
            { ...scope, status: 'succeeded', timestamp: { $gte: since } },
            { amount: 1, timestamp: 1 }
        ).lean();
        for (const r of trendRows) {
            const k = dayKey(new Date(r.timestamp));
            if (trendMap.has(k)) trendMap.set(k, trendMap.get(k) + (r.amount || 0));
        }
        const trend = Array.from(trendMap.entries()).map(([date, amount]) => ({
            date,
            amount: Math.round(amount * 100) / 100,
        }));

        return NextResponse.json({
            success: true,
            summary: {
                total: Math.round((totalAgg[0]?.total || 0) * 100) / 100,
                count: totalAgg[0]?.count || 0,
                monthTotal: Math.round((monthAgg[0]?.total || 0) * 100) / 100,
                monthCount: monthAgg[0]?.count || 0,
                recurringActive: recurringRows.length,
                recurringMonthlyValue: Math.round(recurringMonthlyValue * 100) / 100,
            },
            trend,
            recurring: recurringRows,
            recent,
            topDonors,
            byFrequency,
            rangeDays: days,
        }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/donations error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
