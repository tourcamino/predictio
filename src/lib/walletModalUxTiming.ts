/** Visual-only timing for wallet modal steps (does not delay real wallet/auth). */
export const WALLET_CONNECTING_MIN_MS = 1100;
export const WALLET_SUCCESS_MIN_MS = 1200;
export const WALLET_STAGE_INTERVAL_MS = 300;
export const WALLET_SUCCESS_AUTO_CLOSE_MS = 1800;

export function remainingMinDisplayMs(startedAt: number | null, minMs: number): number {
  if (startedAt == null) return minMs;
  return Math.max(0, minMs - (Date.now() - startedAt));
}
