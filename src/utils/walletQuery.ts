/**
 * Canonical wallet string for tRPC inputs and React Query cache keys.
 * Must match server-side normalization (`toLowerCase()` on `User.wallet`, `PointsLedger.walletAddress`, etc.).
 * EIP-55 checksummed addresses from MetaMask would otherwise create duplicate cache entries and stale UI.
 */
export function normalizeWalletForQuery(
  wallet: string | null | undefined,
): string {
  const t = wallet?.trim() ?? "";
  if (!t) return "";
  return t.toLowerCase();
}

/**
 * Stable integer for TanStack / tRPC **cache keys only**. Paper DB reads are chain-agnostic
 * today; we still scope the client cache so a chain switch cannot reuse the prior chain's
 * in-memory snapshot (stale portfolio / ghost counts).
 *
 * `-1` = unknown (disconnected, mock connect without chain, or provider not reporting yet).
 */
export function clientChainScopeForTrpc(
  chainId: number | null | undefined,
): number {
  return typeof chainId === "number" &&
    Number.isFinite(chainId) &&
    Number.isInteger(chainId)
    ? chainId
    : -1;
}
