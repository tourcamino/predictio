import { useQuery } from "@tanstack/react-query";
import { useTRPCClient } from "~/trpc/react";
import {
  expressGetPointsLeaderboard,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";

export type PointsLeaderboardData =
  inferRouterOutputs<AppRouter>["getPointsLeaderboard"];

export function usePointsLeaderboard(input: {
  limit?: number;
  currentUserWallet?: string;
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}) {
  const useExpress = shouldUseExpressForWalletCritical();
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: [
      "getPointsLeaderboard",
      input.limit ?? 50,
      input.currentUserWallet?.toLowerCase() ?? "",
      useExpress ? "express" : "trpc",
    ] as const,
    enabled: input.enabled ?? true,
    staleTime: input.staleTime ?? 55_000,
    refetchInterval: input.refetchInterval,
    queryFn: async (): Promise<PointsLeaderboardData> => {
      if (useExpress) {
        return (await expressGetPointsLeaderboard({
          limit: input.limit,
          currentUserWallet: input.currentUserWallet,
        })) as PointsLeaderboardData;
      }
      return trpcClient.getPointsLeaderboard.query({
        limit: input.limit ?? 50,
        currentUserWallet: input.currentUserWallet,
      });
    },
  });
}
