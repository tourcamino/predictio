import { useQuery } from "@tanstack/react-query";
import { useTRPCClient } from "~/trpc/react";
import {
  expressGetAnalystLeaderboard,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";

export type AnalystLeaderboardData =
  inferRouterOutputs<AppRouter>["getAnalystLeaderboard"];

export function useAnalystLeaderboard(input: {
  limit?: number;
  sortBy?: "roi" | "winRate" | "followers" | "earned";
  currentUserWallet?: string;
  enabled?: boolean;
}) {
  const useExpress = shouldUseExpressForWalletCritical();
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: [
      "getAnalystLeaderboard",
      input.limit ?? 50,
      input.sortBy ?? "earned",
      input.currentUserWallet?.toLowerCase() ?? "",
      useExpress ? "express" : "trpc",
    ] as const,
    enabled: input.enabled ?? true,
    staleTime: 55_000,
    queryFn: async (): Promise<AnalystLeaderboardData> => {
      if (useExpress) {
        return (await expressGetAnalystLeaderboard({
          limit: input.limit,
          sortBy: input.sortBy,
          currentUserWallet: input.currentUserWallet,
        })) as AnalystLeaderboardData;
      }
      return trpcClient.getAnalystLeaderboard.query({
        limit: input.limit ?? 50,
        sortBy: input.sortBy ?? "earned",
        currentUserWallet: input.currentUserWallet,
      });
    },
  });
}
