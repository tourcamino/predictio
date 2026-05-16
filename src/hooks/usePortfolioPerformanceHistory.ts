import { useQuery } from "@tanstack/react-query";
import { useTRPCClient } from "~/trpc/react";
import { useWallet } from "~/store/useWalletStore";
import { normalizeWalletForQuery } from "~/utils/walletQuery";
import {
  expressGetPortfolioPerformanceHistory,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";

export type PortfolioPerformanceTimeRange =
  | "7D"
  | "30D"
  | "90D"
  | "1W"
  | "1M"
  | "3M"
  | "6M"
  | "1Y"
  | "ALL"
  | "CUSTOM";

export type PortfolioPerformanceData =
  inferRouterOutputs<AppRouter>["getPortfolioPerformanceHistory"];

export function usePortfolioPerformanceHistory(input: {
  timeRange: PortfolioPerformanceTimeRange;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}) {
  const { address, isConnected } = useWallet();
  const walletKey = normalizeWalletForQuery(address);
  const useExpress = shouldUseExpressForWalletCritical();
  const trpcClient = useTRPCClient();
  const enabled = (input.enabled ?? true) && Boolean(isConnected && walletKey);

  return useQuery({
    queryKey: [
      "getPortfolioPerformanceHistory",
      walletKey ?? "",
      input.timeRange,
      input.startDate?.toISOString() ?? "",
      input.endDate?.toISOString() ?? "",
      useExpress ? "express" : "trpc",
    ] as const,
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<PortfolioPerformanceData> => {
      const w = walletKey!;
      if (useExpress) {
        return (await expressGetPortfolioPerformanceHistory({
          walletAddress: w,
          timeRange: input.timeRange,
        })) as PortfolioPerformanceData;
      }
      return trpcClient.getPortfolioPerformanceHistory.query({
        walletAddress: w,
        timeRange: input.timeRange,
        startDate: input.startDate,
        endDate: input.endDate,
      });
    },
  });
}
