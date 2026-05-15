import type { QueryClient } from "@tanstack/react-query";

const PROTOCOL_LIQUIDITY_MARKERS = [
  "getProtocolVaultStats",
  "getCanonicalLiquidityState",
  "paperWalletBalance",
  "getLPMarkets",
  "getUserLPPositions",
  "curatedMarkets",
  "getAzuroMarkets",
] as const;

/**
 * Invalidate vault, liquidity, and curated catalog caches after catalog lifecycle changes.
 */
export function invalidateProtocolLiquidityQueries(
  queryClient: QueryClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trpc?: any,
) {
  queryClient.invalidateQueries({
    predicate: (q) => {
      try {
        const s = JSON.stringify(q.queryKey).toLowerCase();
        return PROTOCOL_LIQUIDITY_MARKERS.some((m) => s.includes(m.toLowerCase()));
      } catch {
        return false;
      }
    },
  });

  queryClient.invalidateQueries({ queryKey: ["catalogLiquidityVersion"] });

  if (trpc?.getProtocolVaultStats?.queryKey) {
    queryClient.invalidateQueries({
      queryKey: trpc.getProtocolVaultStats.queryKey({}),
    });
  }
  if (trpc?.getCanonicalLiquidityState?.queryKey) {
    queryClient.invalidateQueries({
      queryKey: trpc.getCanonicalLiquidityState.queryKey({}),
    });
  }
}
