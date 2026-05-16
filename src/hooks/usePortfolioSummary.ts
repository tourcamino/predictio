import { useQuery } from "@tanstack/react-query";
import { useTRPCClient } from "~/trpc/react";
import { useWallet } from "~/store/useWalletStore";
import { clientChainScopeForTrpc, normalizeWalletForQuery } from "~/utils/walletQuery";
import {
  expressGetPortfolioSummary,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";

export type PortfolioSummaryData = inferRouterOutputs<AppRouter>["getPortfolioSummary"];

export function usePortfolioSummary(options?: { enabled?: boolean }) {
  const { address, chainId, isConnected } = useWallet();
  const walletKey = normalizeWalletForQuery(address);
  const chainScope = clientChainScopeForTrpc(chainId);
  const useExpress = shouldUseExpressForWalletCritical();
  const trpcClient = useTRPCClient();
  const enabled = (options?.enabled ?? true) && Boolean(isConnected && walletKey);

  return useQuery({
    queryKey: [
      "getPortfolioSummary",
      walletKey ?? "",
      chainScope,
      useExpress ? "express" : "trpc",
    ] as const,
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<PortfolioSummaryData> => {
      const w = walletKey!;
      if (useExpress) {
        return (await expressGetPortfolioSummary(w)) as PortfolioSummaryData;
      }
      return trpcClient.getPortfolioSummary.query({
        walletAddress: w,
        clientChainId: chainScope,
      });
    },
  });
}
