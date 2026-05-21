import { NextResponse } from "next/server";
import { runIdleSweep } from "@/lib/idleSweep";

/**
 * Manual / external trigger for the idle meeting sweep.
 *
 * On our self-hosted (Docker / `next start`) deploy this normally runs itself
 * every minute via the in-process scheduler in instrumentation.ts, so you do
 * NOT need an external cron. This route stays for:
 *   - manual runs / debugging:   GET /api/v1/meeting/idle-sweep?secret=...
 *   - serverless deploys where the in-process timer can't run, driven by an
 *     external scheduler (Vercel Cron, GitHub Actions, cron-as-a-service).
 *
 * Auth: protect with `?secret=<env CRON_SECRET>`, the `x-cron-secret` header, or
 * an `Authorization: Bearer <CRON_SECRET>` header (what Vercel Cron sends).
 * Refuses to run if CRON_SECRET is unset.
 *
 * Returns: { scanned, warned, ended, reaped }
 */
async function handle(req) {
    try {
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
            return NextResponse.json(
                { success: false, message: 'CRON_SECRET env var is not set — refusing to run' },
                { status: 500 }
            );
        }
        const { searchParams } = new URL(req.url);
        const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
        const secret = searchParams.get('secret') || req.headers.get('x-cron-secret') || bearer;
        if (secret !== cronSecret) {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const result = await runIdleSweep();
        return NextResponse.json({ success: true, ...result }, { status: 200 });
    } catch (error) {
        console.error('idle-sweep route error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export const GET = handle;
export const POST = handle;
