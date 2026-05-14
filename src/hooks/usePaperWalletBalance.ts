import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useWallet } from "~/store/useWalletStore";
import { clientChainScopeForTrpc, normalizeWalletForQuery } from "~/utils/walletQuery";

/**
 * Paper wallet **USDC cash** (`User.virtualBalance`) + open-order cost basis — always from **tRPC** / DB.
 * Demo guest balance stays in `useDemoAccount` / `demoStorage`, not here.
 *
 * Dev mock connect (`VITE_WALLET_MOCK_CONNECT`, `chainId === null`) uses store `balance` as a local stub only.
 */
export function usePaperWalletBalance() {
  const { isConnected, address, chainId, balance: mockStoreBalance } = useWallet();
  const walletKey = normalizeWalletForQuery(address);
  const chainScope = clientChainScopeForTrpc(chainId);
  const trpc = useTRPC();

  const mockDevPaper =
    import.meta.env.DEV &&
    import.meta.env.VITE_WALLET_MOCK_CONNECT === "1" &&
    !import.meta.env.PROD &&
    isConnected &&
    chainId === null;

  const q = useQuery({
    ...trpc.getPaperWalletBalance.queryOptions({
      walletAddress: walletKey ?? "",
      clientChainId: chainScope,
    }),
    enabled: Boolean(isConnected && walletKey && chainId !== null),
    staleTime: 15_000,
  });

  const serverCash = q.data?.virtualBalance ?? 0;
  const inOpenPositions = q.data?.openPositionsCostBasis ?? 0;
  const cashUsdc = mockDevPaper ? mockStoreBalance : serverCash;
  const totalAtCost = mockDevPaper ? mockStoreBalance : serverCash + inOpenPositions;

  return {
    ...q,
    cashUsdc,
    inOpenPositions,
    totalAtCost,
    mockDevPaper,
  };
}
