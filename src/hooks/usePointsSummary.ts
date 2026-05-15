import { useQuery } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "~/trpc/react";
import { normalizeWalletForQuery } from "~/utils/walletQuery";
import { useWallet } from "~/store/useWalletStore";
import {
  expressGetPointsSummaryFull,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";

export type PointsSummaryData = Awaited<
  ReturnType<typeof expressGetPointsSummaryFull>
>;

/**
 * Rewards/points — canonical VPS Express on production (same as paper balance).
 */
export function usePointsSummary(options?: { enabled?: boolean }) {
  const { address, isConnected } = useWallet();
  const walletKey = normalizeWalletForQuery(address);
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const useExpress = shouldUseExpressForWalletCritical();

  const enabled =
    options?.enabled !== undefined
      ? options.enabled && Boolean(walletKey && isConnected)
      : Boolean(walletKey && isConnected);

  const q = useQuery({
    queryKey: ["walletPointsSummary", walletKey ?? "", useExpress ? "express" : "trpc"] as const,
    enabled,
    staleTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(2500, 400 * 2 ** attempt),
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<PointsSummaryData> => {
      const w = walletKey!;
      if (useExpress) {
        return expressGetPointsSummaryFull(w);
      }
      return trpcClient.getPointsSummary.query({ walletAddress: w });
    },
  });

  const isPointsLoading = enabled && (q.isPending || (q.isFetching && !q.data));
  const pointsLoadFailed = q.isError;
  const totalPoints =
    !pointsLoadFailed && q.data != null ? q.data.totalPoints : null;
  const tier = q.data?.tier ?? "BRONZE";

  return {
    ...q,
    totalPoints,
    tier,
    isPointsLoading,
    pointsLoadFailed,
  };
}
