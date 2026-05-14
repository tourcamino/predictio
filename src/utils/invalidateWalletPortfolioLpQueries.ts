import type { QueryClient } from '@tanstack/react-query';

import { invalidateWalletPointsSummary } from '~/utils/invalidateWalletNotifications';

/**
 * After add/remove/claim LP, refetch the same surfaces as paper trading (`TradingBox` / `closePosition` pattern).
 */
export function invalidateWalletPortfolioLpQueries(
  queryClient: QueryClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tRPC `queryKey` factories are not assignable to a small structural type across router versions.
  trpc: any,
  walletKey: string,
) {
  const w = walletKey.trim().toLowerCase();
  if (!w) return;

  queryClient.invalidateQueries({
    queryKey: trpc.getUserLPPositions.queryKey({ walletAddress: w, status: 'active' }),
  });
  queryClient.invalidateQueries({
    queryKey: trpc.getUserLPPositions.queryKey({ walletAddress: w, status: 'all' }),
  });
  queryClient.invalidateQueries({
    queryKey: trpc.getPortfolioSummary.queryKey({ walletAddress: w }),
  });
  queryClient.invalidateQueries({
    queryKey: trpc.getUserPositions.queryKey({ walletAddress: w, status: 'open' }),
  });
  queryClient.invalidateQueries({
    queryKey: trpc.getUserPositions.queryKey({ walletAddress: w, status: 'all' }),
  });
  invalidateWalletPointsSummary(queryClient, trpc.getPointsSummary.queryKey, w);

  queryClient.invalidateQueries({
    predicate: (q) => {
      try {
        const s = JSON.stringify(q.queryKey);
        return s.includes('getTransactionHistory') || s.includes('getPortfolioPerformanceHistory');
      } catch {
        return false;
      }
    },
  });
}
