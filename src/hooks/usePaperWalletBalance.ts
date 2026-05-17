import { useQuery } from "@tanstack/react-query";
import { useTRPCClient } from "~/trpc/react";
import { useWallet } from "~/store/useWalletStore";
import { clientChainScopeForTrpc, normalizeWalletForQuery } from "~/utils/walletQuery";
import {
  expressGetPaperWalletBalance,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import { walletConnectTrace } from "~/lib/walletConnectTrace";

export type PaperWalletBalanceSnapshot = {
  virtualBalance: number;
  openPositionsCostBasis: number;
};

/**
 * Paper wallet **USDC cash** (`User.virtualBalance`) + open-order cost basis — DB source of truth.
 * On production (SPA ≠ API host), reads Express `/api/v1/web/paper-wallet-balance`.
 */
export function usePaperWalletBalance() {
  const { isConnected, address, chainId, balance: mockStoreBalance } = useWallet();
  const walletKey = normalizeWalletForQuery(address);
  const chainScope = clientChainScopeForTrpc(chainId);
  const trpcClient = useTRPCClient();

  const mockDevPaper =
    import.meta.env.DEV &&
    import.meta.env.VITE_WALLET_MOCK_CONNECT === "1" &&
    !import.meta.env.PROD &&
    isConnected &&
    chainId === null;

  const useExpress = shouldUseExpressForWalletCritical();

  const q = useQuery({
    queryKey: [
      "paperWalletBalance",
      walletKey ?? "",
      chainScope,
      useExpress ? "express" : "trpc",
    ] as const,
    enabled: Boolean(isConnected && walletKey && !mockDevPaper),
    staleTime: 15_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 5000),
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<PaperWalletBalanceSnapshot> => {
      const w = walletKey!;
      walletConnectTrace("balance_fetch_start", { walletKey: w, useExpress });
      try {
        const out = useExpress
          ? await expressGetPaperWalletBalance(w)
          : await trpcClient.getPaperWalletBalance.query({
              walletAddress: w,
              clientChainId: chainScope,
            });
        walletConnectTrace("balance_fetch_response", {
          walletKey: w,
          virtualBalance: out.virtualBalance,
        });
        return out;
      } catch (e) {
        walletConnectTrace("balance_fetch_error", {
          walletKey: w,
          message: e instanceof Error ? e.message : String(e),
        });
        throw e;
      }
    },
  });

  const hasSettledBalance = q.data !== undefined && !q.isPending;
  const isBalanceLoading =
    Boolean(isConnected && walletKey && !mockDevPaper) &&
    (q.isPending || (q.isFetching && !hasSettledBalance));

  const serverCash = hasSettledBalance ? q.data!.virtualBalance : null;
  const inOpenPositions = hasSettledBalance ? q.data!.openPositionsCostBasis : 0;

  const cashUsdc = mockDevPaper
    ? mockStoreBalance
    : serverCash ?? 0;
  const totalAtCost = mockDevPaper
    ? mockStoreBalance
    : (serverCash ?? 0) + inOpenPositions;

  return {
    ...q,
    cashUsdc,
    /** Null while loading/syncing — use with `formatPaperCashDisplay` to avoid flashing $0. */
    cashUsdcSettled: mockDevPaper ? mockStoreBalance : serverCash,
    inOpenPositions,
    totalAtCost,
    isBalanceLoading,
    mockDevPaper,
  };
}
