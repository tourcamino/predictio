import { env } from "~/server/env";
import { runAutonomousCopyAnalystTick } from "~/server/services/autonomousCopyAnalystTrader";

const g = globalThis as typeof globalThis & {
  __autonomousCopyAnalystTimer?: ReturnType<typeof setInterval>;
  __autonomousCopyAnalystStarted?: boolean;
};

function intervalMs(): number {
  const raw = Number(process.env.AUTONOMOUS_COPY_ANALYSTS_INTERVAL_MS);
  if (Number.isFinite(raw) && raw >= 120_000) return raw;
  return 900_000;
}

export function isAutonomousCopyAnalystsEnabled(): boolean {
  return process.env.AUTONOMOUS_COPY_ANALYSTS_ENABLED === "true";
}

/**
 * Idempotent: starts one interval per process. Safe for VPS `node-server` single worker.
 * For serverless, use the cron script instead.
 */
export function startAutonomousCopyAnalystScheduler(): void {
  if (!isAutonomousCopyAnalystsEnabled()) return;
  /** Serverless: avoid dangling timers — use `npm run autonomous-copy-analysts:tick` on a schedule */
  if (process.env.VERCEL === "1") return;
  if (g.__autonomousCopyAnalystStarted) return;
  g.__autonomousCopyAnalystStarted = true;

  const ms = intervalMs();
  console.log(
    `[AutonomousCopyAnalyst] Scheduler on every ${ms / 60000} min (env NODE_ENV=${env.NODE_ENV})`,
  );

  const run = () => {
    runAutonomousCopyAnalystTick()
      .then((r) => {
        if (r.opened > 0 || r.marketsResolved > 0) {
          console.log(
            `[AutonomousCopyAnalyst] tick: opened=${r.opened}, marketsResolved=${r.marketsResolved}`,
          );
        }
      })
      .catch((e) => console.error("[AutonomousCopyAnalyst] tick failed:", e));
  };

  run();
  g.__autonomousCopyAnalystTimer = setInterval(run, ms);
}
