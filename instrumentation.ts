/**
 * Next.js instrumentation hook — runs once when the server process starts.
 *
 * On our long-running deploy (`next start` in Docker) this lets the app run its
 * own idle-meeting sweep every minute, with no external cron/scheduler needed.
 * Guards:
 *   - nodejs runtime only (skip the edge runtime where timers/DB aren't viable),
 *   - a module-level flag so HMR / double-registration in dev can't stack
 *     multiple intervals.
 *
 * If you ever deploy serverlessly (where there's no persistent process), this
 * timer simply won't run — fall back to hitting /api/v1/meeting/idle-sweep from
 * an external scheduler instead.
 */
const IDLE_SWEEP_INTERVAL_MS = 60_000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Allow opting out (e.g. when an external scheduler owns the sweep).
  if (process.env.DISABLE_IN_PROCESS_CRON === '1') {
    console.log('[idle-sweep] in-process scheduler disabled via DISABLE_IN_PROCESS_CRON');
    return;
  }

  // Survive dev HMR / accidental double-register.
  const g = globalThis as unknown as { __idleSweepStarted?: boolean };
  if (g.__idleSweepStarted) return;
  g.__idleSweepStarted = true;

  // Import lazily so the edge bundle never pulls in the server SDK / mongoose.
  const { runIdleSweep } = await import('@/lib/idleSweep');

  const tick = async () => {
    try {
      const result = await runIdleSweep();
      // Log whenever there's at least one tracked room, so it's clear whether
      // the sweep is seeing your meetings. Silent only when nothing is live.
      if (result.scanned || result.warned || result.ended || result.reaped) {
        console.log('[idle-sweep]', result);
      }
    } catch (e) {
      console.error('[idle-sweep] failed:', (e as Error)?.message);
    }
  };

  // Don't run at the very instant of boot — let DB/env settle, then every minute.
  setTimeout(() => {
    tick();
    setInterval(tick, IDLE_SWEEP_INTERVAL_MS);
  }, 15_000);

  console.log('[idle-sweep] in-process scheduler started (every 60s)');
}
