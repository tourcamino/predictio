/** Visual-only timing for wallet modal steps (does not delay real wallet/auth). */
export const WALLET_CONNECTING_MIN_MS = 1200;
export const WALLET_SUCCESS_MIN_MS = 1200;
/** Minimum dwell per onboarding stage label (readable, no flicker). */
export const WALLET_STAGE_INTERVAL_MS = 950;
export const WALLET_SUCCESS_AUTO_CLOSE_MS = 1800;
/** Abort connecting UI if wallet I/O never settles (avoids infinite "Syncing balance"). */
export const WALLET_CONNECTING_MAX_MS = 22_000;
/** Wall-clock cap for server sync during connect (independent of silent retries). */
export const WALLET_SYNC_WALL_CLOCK_MS = 18_000;

export function remainingMinDisplayMs(startedAt: number | null, minMs: number): number {
  if (startedAt == null) return minMs;
  return Math.max(0, minMs - (Date.now() - startedAt));
}
