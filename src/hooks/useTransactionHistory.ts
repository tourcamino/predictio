import { useQuery } from "@tanstack/react-query";
import { useTRPCClient } from "~/trpc/react";
import { useWallet } from "~/store/useWalletStore";
import { clientChainScopeForTrpc, normalizeWalletForQuery } from "~/utils/walletQuery";
import type { LedgerHistoryFilter } from "~/lib/ledger/ledgerTransactionTypes";
import {
  expressGetTransactionHistory,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";

export type TransactionHistoryData =
  inferRouterOutputs<AppRouter>["getTransactionHistory"];

export function useTransactionHistory(input: {
  limit?: number;
  offset?: number;
  type?: LedgerHistoryFilter;
  enabled?: boolean;
}) {
  const { address, chainId, isConnected } = useWallet();
  const walletKey = normalizeWalletForQuery(address);
  const chainScope = clientChainScopeForTrpc(chainId);
  const useExpress = shouldUseExpressForWalletCritical();
  const trpcClient = useTRPCClient();
  const enabled = (input.enabled ?? true) && Boolean(isConnected && walletKey);
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;
  const type = input.type ?? "all";

  return useQuery({
    queryKey: [
      "getTransactionHistory",
      walletKey ?? "",
      limit,
      offset,
      type,
      chainScope,
      useExpress ? "express" : "trpc",
    ] as const,
    enabled,
    staleTime: 15_000,
    queryFn: async (): Promise<TransactionHistoryData> => {
      const w = walletKey!;
      if (useExpress) {
        return (await expressGetTransactionHistory({
          walletAddress: w,
          limit,
          offset,
          type,
        })) as TransactionHistoryData;
      }
      return trpcClient.getTransactionHistory.query({
        walletAddress: w,
        limit,
        offset,
        type,
        clientChainId: chainScope,
      });
    },
  });
}
