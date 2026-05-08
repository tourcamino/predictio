import type { SeedMarket } from "~/data/seedMarkets";

/** Milliseconds when trading locks (kickoff). */
export function getTradingLockMs(m: SeedMarket): number {
  const raw = m.event?.lockedAt ?? m.event?.startsAt ?? m.endsAt;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : Number.NaN;
}

/**
 * Paper trading stops at kickoff / `lockedAt`.
 * Curated API maps post-lock rows to `status: "live"` (match underway, not tradable).
 */
export function isSeedMarketTradable(m: SeedMarket): boolean {
  if (m.status === "resolved" || m.status === "locked") return false;
  if (m.status === "live") return false;

  const lockMs = getTradingLockMs(m);
  if (!Number.isFinite(lockMs)) {
    return m.status === "upcoming" || m.status === "ending-soon";
  }
  return Date.now() < lockMs;
}

/** Hours until trading locks; +Infinity if unknown. */
export function hoursUntilTradingLock(m: SeedMarket): number {
  const lockMs = getTradingLockMs(m);
  if (!Number.isFinite(lockMs)) return Number.POSITIVE_INFINITY;
  return (lockMs - Date.now()) / (1000 * 60 * 60);
}
