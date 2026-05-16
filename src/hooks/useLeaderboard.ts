import { useQuery } from "@tanstack/react-query";
import { useTRPCClient } from "~/trpc/react";
import {
  expressGetLeaderboard,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";

export type LeaderboardData = inferRouterOutputs<AppRouter>["getLeaderboard"];

export function useLeaderboard(input: {
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
      "getLeaderboard",
      input.limit ?? 50,
      input.currentUserWallet?.toLowerCase() ?? "",
      useExpress ? "express" : "trpc",
    ] as const,
    enabled: input.enabled ?? true,
    staleTime: input.staleTime ?? 55_000,
    refetchInterval: input.refetchInterval,
    queryFn: async (): Promise<LeaderboardData> => {
      if (useExpress) {
        return (await expressGetLeaderboard({
          limit: input.limit,
          currentUserWallet: input.currentUserWallet,
        })) as LeaderboardData;
      }
      return trpcClient.getLeaderboard.query({
        limit: input.limit ?? 50,
        currentUserWallet: input.currentUserWallet,
      });
    },
  });
}
