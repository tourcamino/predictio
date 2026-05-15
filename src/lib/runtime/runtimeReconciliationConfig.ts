import { env } from "~/server/env";

function parseHours(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export type RuntimeReconciliationThresholds = {
  /** `Market.status=open` past `closesAt` by this many hours → stale LOCKED. */
  staleLockedHours: number;
  /** `Market.status=closed` without `resolvedAt` for this long after kickoff → stale RESOLVING. */
  staleResolvingHours: number;
  /** `under_review` / `disputeReason` stuck after kickoff by this many hours → stale DISPUTED. */
  staleDisputedHours: number;
};

export function getRuntimeReconciliationThresholds(): RuntimeReconciliationThresholds {
  return {
    staleLockedHours: parseHours(env.STALE_LOCKED_HOURS, 6),
    staleResolvingHours: parseHours(env.STALE_RESOLVING_HOURS, 48),
    staleDisputedHours: parseHours(env.STALE_DISPUTED_HOURS, 168),
  };
}
