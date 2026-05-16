import type { QueryClient } from '@tanstack/react-query';

import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { invalidateWalletPointsSummary } from '~/utils/invalidateWalletNotifications';

const WALLET_SCOPED_READ_MARKERS = [
  'getUserLPPositions',
  'getPortfolioSummary',
  'getUserPositions',
  'getPaperWalletBalance',
] as const;

function queryKeyJsonLikelyMatchesWallet(
  queryKey: readonly unknown[],
  walletLower: string,
): boolean {
  try {
    const s = JSON.stringify(queryKey).toLowerCase();
    if (!s.includes(`"walletaddress":"${walletLower}"`)) return false;
    return WALLET_SCOPED_READ_MARKERS.some((m) => s.includes(m.toLowerCase()));
  } catch {
    return false;
  }
}

/**
 * After add/remove/claim LP, refetch the same surfaces as paper trading (`TradingBox` / `closePosition` pattern).
 * Uses a predicate so every `clientChainId` cache variant for this wallet is invalidated.
 */
export function invalidateWalletPortfolioLpQueries(
  queryClient: QueryClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tRPC `queryKey` factories are not assignable to a small structural type across router versions.
  trpc: any,
  walletAddress: string,
) {
  const w = normalizeWalletForQuery(walletAddress);
  if (!w) return;

  queryClient.invalidateQueries({
    predicate: (q) => queryKeyJsonLikelyMatchesWallet(q.queryKey, w),
  });

  const walletReadPrefixes = [
    "getUserPositions",
    "getPortfolioSummary",
    "getTransactionHistory",
    "getPortfolioPerformanceHistory",
    "paperWalletBalance",
  ] as const;

  queryClient.invalidateQueries({
    predicate: (q) => {
      const key = q.queryKey;
      if (!Array.isArray(key) || key.length < 2) return false;
      const head = key[0];
      if (typeof head !== "string") return false;
      if (!walletReadPrefixes.some((p) => head === p || head.startsWith(p))) {
        return false;
      }
      return String(key[1]).toLowerCase() === w;
    },
  });

  queryClient.invalidateQueries({
    queryKey: ['paperWalletBalance', w],
  });

  invalidateWalletPointsSummary(queryClient, trpc.getPointsSummary.queryKey, w);

  queryClient.invalidateQueries({
    predicate: (q) => {
      try {
        const s = JSON.stringify(q.queryKey).toLowerCase();
        if (!s.includes(`"walletaddress":"${w}"`)) return false;
        return (
          s.includes('gettransactionhistory') ||
          s.includes('getportfolioperformancehistory')
        );
      } catch {
        return false;
      }
    },
  });
}

/** After market-wide paper resolution: refresh every cached positions / portfolio read model. */
export function invalidateAllPredictionPortfolioCachesForAnyWallet(
  queryClient: QueryClient,
) {
  queryClient.invalidateQueries({
    predicate: (q) => {
      try {
        const s = JSON.stringify(q.queryKey);
        const hasWallet =
          s.includes('"walletAddress"') || s.includes('"walletaddress"');
        if (!hasWallet) return false;
        return (
          s.includes('getUserPositions') || s.includes('getPortfolioSummary')
        );
      } catch {
        return false;
      }
    },
  });
}
