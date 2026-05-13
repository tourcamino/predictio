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
