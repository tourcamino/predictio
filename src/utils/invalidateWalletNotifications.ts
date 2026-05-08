import type { QueryClient } from '@tanstack/react-query';

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
  const w = walletAddress.trim();
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
}

type GetPointsSummaryKey = (input: { walletAddress: string }) => readonly unknown[];

export function invalidateWalletPointsSummary(
  queryClient: QueryClient,
  getPointsSummaryQueryKey: GetPointsSummaryKey,
  walletAddress: string,
) {
  const w = walletAddress.trim();
  if (!w) return;
  queryClient.invalidateQueries({
    queryKey: getPointsSummaryQueryKey({ walletAddress: w }),
  });
}

/** After bulk events (e.g. market resolution) many wallets may gain points. */
export function invalidateAllPointsSummaryQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    predicate: (q) => {
      try {
        return JSON.stringify(q.queryKey).includes("getPointsSummary");
      } catch {
        return false;
      }
    },
  });
}
