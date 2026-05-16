import { useQuery } from "@tanstack/react-query";
import { useTRPCClient } from "~/trpc/react";
import { shouldUseExpressForWalletCritical } from "~/lib/expressCriticalWalletApi";
import { fetchMarketSnapshotFromRest } from "~/utils/fetchMarketDetailWithRestFallback";
import type { Market } from "~/data/mockMarkets";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";

export type MarketSummariesData =
  inferRouterOutputs<AppRouter>["getMarketSummaries"];

async function fetchMarketSummariesViaRest(
  marketIds: string[],
): Promise<Record<string, Market | null>> {
  const dedup = [...new Set(marketIds.filter(Boolean))];
  const pairs = await Promise.all(
    dedup.map(async (id) => {
      const m = await fetchMarketSnapshotFromRest(id);
      return [id, m] as const;
    }),
  );
  return Object.fromEntries(pairs);
}

export function useMarketSummaries(input: {
  marketIds: string[];
  enabled?: boolean;
  staleTime?: number;
}) {
  const useExpress = shouldUseExpressForWalletCritical();
  const trpcClient = useTRPCClient();
  const ids = [...new Set(input.marketIds.filter(Boolean))];

  return useQuery({
    queryKey: [
      "getMarketSummaries",
      ids.slice().sort().join(","),
      useExpress ? "express-rest" : "trpc",
    ] as const,
    enabled: (input.enabled ?? true) && ids.length > 0,
    staleTime: input.staleTime ?? 30_000,
    queryFn: async (): Promise<MarketSummariesData> => {
      if (useExpress) {
        return fetchMarketSummariesViaRest(ids);
      }
      return trpcClient.getMarketSummaries.query({ marketIds: ids });
    },
  });
}
