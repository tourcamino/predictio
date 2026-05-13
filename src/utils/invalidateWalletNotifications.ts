import type { QueryClient } from '@tanstack/react-query';

import { normalizeWalletForQuery } from '~/utils/walletQuery';

type GetNotificationsKey = (input: {
  walletAddress: string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}) => readonly unknown[];

/**
 * tRPC creates separate cache entries per input; invalidate all variants used in the app.
 */
export function invalidateWalletNotifications(
  queryClient: QueryClient,
  getNotificationsQueryKey: GetNotificationsKey,
  walletAddress: string,
) {
  const w = normalizeWalletForQuery(walletAddress);
  if (!w) return;

  const variants: Parameters<GetNotificationsKey>[0][] = [
    { walletAddress: w, limit: 1, offset: 0 },
    { walletAddress: w, limit: 50, offset: 0 },
    { walletAddress: w, limit: 100, offset: 0 },
    { walletAddress: w, limit: 100, offset: 0, unreadOnly: true },
    { walletAddress: w, limit: 100, offset: 0, unreadOnly: false },
  ];

  for (const input of variants) {
    queryClient.invalidateQueries({ queryKey: getNotificationsQueryKey(input) });
  }
  const raw = walletAddress.trim();
  if (raw && raw !== w) {
    const legacyVariants: Parameters<GetNotificationsKey>[0][] = [
      { walletAddress: raw, limit: 1, offset: 0 },
      { walletAddress: raw, limit: 50, offset: 0 },
      { walletAddress: raw, limit: 100, offset: 0 },
      { walletAddress: raw, limit: 100, offset: 0, unreadOnly: true },
      { walletAddress: raw, limit: 100, offset: 0, unreadOnly: false },
    ];
    for (const input of legacyVariants) {
      queryClient.invalidateQueries({ queryKey: getNotificationsQueryKey(input) });
    }
  }
}

type GetPointsSummaryKey = (input: { walletAddress: string }) => readonly unknown[];

export function invalidateWalletPointsSummary(
  queryClient: QueryClient,
  getPointsSummaryQueryKey: GetPointsSummaryKey,
  walletAddress: string,
) {
  const w = normalizeWalletForQuery(walletAddress);
  if (!w) return;
  const key = getPointsSummaryQueryKey({ walletAddress: w });
  queryClient.invalidateQueries({ queryKey: key });
  queryClient.invalidateQueries({ queryKey: ["expressPointsSummary", w] });
  queryClient.invalidateQueries({ queryKey: ["walletPointsSummary", w] });
  // Legacy cache entries keyed with checksummed address (before normalization).
  const raw = walletAddress.trim();
  if (raw && raw !== w) {
    queryClient.invalidateQueries({
      queryKey: getPointsSummaryQueryKey({ walletAddress: raw }),
    });
    queryClient.invalidateQueries({ queryKey: ["expressPointsSummary", raw.toLowerCase()] });
    queryClient.invalidateQueries({ queryKey: ["walletPointsSummary", raw.toLowerCase()] });
  }
}

/** After bulk events (e.g. market resolution) many wallets may gain points. */
export function invalidateAllPointsSummaryQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    predicate: (q) => {
      try {
        const s = JSON.stringify(q.queryKey);
        return (
          s.includes("getPointsSummary") ||
          s.includes("walletPointsSummary") ||
          s.includes("expressPointsSummary")
        );
      } catch {
        return false;
      }
    },
  });
}
