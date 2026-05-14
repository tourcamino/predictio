import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useWallet } from "~/store/useWalletStore";
import { clientChainScopeForTrpc, normalizeWalletForQuery } from "~/utils/walletQuery";
import { invalidateAllWalletScopedQueries } from "~/utils/invalidateAllWalletScopedQueries";

/**
 * Keeps TanStack Query aligned with wallet identity: account switch, chain switch, disconnect.
 * (DB sync still runs in `WalletSync`; this layer avoids cross-wallet / cross-chain stale snapshots.)
 */
export function WalletScopedQueryLifecycle() {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const { isConnected, address, chainId } = useWallet();
  const prevRef = useRef<{ w: string; c: number } | null>(null);

  useEffect(() => {
    const w = normalizeWalletForQuery(address);
    const c = clientChainScopeForTrpc(chainId);
    const prev = prevRef.current;

    if (!w || !isConnected) {
      if (prev?.w) {
        invalidateAllWalletScopedQueries(queryClient, trpc, prev.w);
      }
      prevRef.current = null;
      return;
    }

    if (prev) {
      if (prev.w !== w) {
        invalidateAllWalletScopedQueries(queryClient, trpc, prev.w);
        invalidateAllWalletScopedQueries(queryClient, trpc, w);
      } else if (prev.c !== c) {
        invalidateAllWalletScopedQueries(queryClient, trpc, w);
      }
    }

    prevRef.current = { w, c };
  }, [address, chainId, isConnected, queryClient, trpc]);

  return null;
}
