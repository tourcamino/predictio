import type { QueryClient } from "@tanstack/react-query";

import { invalidateWalletPortfolioLpQueries } from "~/utils/invalidateWalletPortfolioLpQueries";
import { invalidateWalletNotifications } from "~/utils/invalidateWalletNotifications";

/**
 * Broad invalidation after wallet connect sync or a server-side paper reset,
 * so portfolio / LP / points / notifications / leaderboards refetch together.
 */
export function invalidateAllWalletScopedQueries(
  queryClient: QueryClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trpc: any,
  walletKey: string,
) {
  const w = walletKey.trim().toLowerCase();
  if (!w) return;

  invalidateWalletPortfolioLpQueries(queryClient, trpc, w);
  invalidateWalletNotifications(queryClient, trpc.getNotifications.queryKey, w);

  queryClient.invalidateQueries({
    predicate: (q) => {
      try {
        const s = JSON.stringify(q.queryKey);
        return (
          s.includes("getLeaderboard") ||
          s.includes("getPointsLeaderboard") ||
          s.includes("getLPLeaderboard") ||
          s.includes("getAnalystLeaderboard")
        );
      } catch {
        return false;
      }
    },
  });
}
