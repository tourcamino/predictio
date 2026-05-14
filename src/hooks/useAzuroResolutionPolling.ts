import { useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTRPC } from "~/trpc/react";
import { useWalletStore } from "~/store/useWalletStore";
import { invalidateAllPointsSummaryQueries } from "~/utils/invalidateWalletNotifications";
import { invalidateAllPredictionPortfolioCachesForAnyWallet } from "~/utils/invalidateWalletPortfolioLpQueries";
import { clientChainScopeForTrpc, normalizeWalletForQuery } from "~/utils/walletQuery";

/**
 * Polls Azuro for resolved markets affecting **paper DB orders** for the connected wallet.
 * Uses `getUserPositions` (open) as the only market-id source — not the realtime trading Zustand slice.
 */
export function useAzuroResolutionPolling() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const address = useWalletStore((s) => s.address);
  const isConnected = useWalletStore((s) => s.isConnected);
  const chainId = useWalletStore((s) => s.chainId);
  const walletKey = normalizeWalletForQuery(address);
  const chainScope = clientChainScopeForTrpc(chainId);

  const openOrdersQuery = useQuery({
    ...trpc.getUserPositions.queryOptions({
      walletAddress: walletKey,
      status: "open",
      clientChainId: chainScope,
    }),
    enabled: Boolean(walletKey) && isConnected,
    staleTime: 120_000,
  });

  const activeMarketIds = useMemo(() => {
    const rows = openOrdersQuery.data?.positions ?? [];
    return [...new Set(rows.map((o) => o.marketId))];
  }, [openOrdersQuery.data?.positions]);

  const notifiedMarkets = useRef(new Set<string>());

  const resolveMutation = useMutation(trpc.resolvePaperPositions.mutationOptions());

  const resolutionQuery = useQuery({
    ...trpc.checkAzuroResolutions.queryOptions({
      activeMarketIds,
    }),
    enabled: activeMarketIds.length > 0 && Boolean(walletKey) && isConnected,
    refetchInterval: 300_000,
    staleTime: 290_000,
  });

  useEffect(() => {
    if (!resolutionQuery.data?.resolvedMarkets) return;

    const orders = openOrdersQuery.data?.positions ?? [];

    resolutionQuery.data.resolvedMarkets.forEach(async (resolved) => {
      if (notifiedMarkets.current.has(resolved.marketId)) return;

      const hasOpenExposure = orders.some((o) => o.marketId === resolved.marketId);
      if (!hasOpenExposure) return;

      notifiedMarkets.current.add(resolved.marketId);

      try {
        const winningOutcome =
          resolved.result === "home" ? "YES" : resolved.result === "away" ? "NO" : null;
        if (!winningOutcome) {
          console.warn(
            "[AzuroResolutionPolling] Unexpected oracle result shape:",
            resolved.marketId,
            resolved.result,
          );
          notifiedMarkets.current.delete(resolved.marketId);
          return;
        }

        await resolveMutation.mutateAsync({
          marketId: resolved.marketId,
          winningOutcome,
        });

        invalidateAllPredictionPortfolioCachesForAnyWallet(queryClient);
        invalidateAllPointsSummaryQueries(queryClient);

        console.log(`[Paper Trading] Resolved positions for market ${resolved.marketId}`);
      } catch (error) {
        console.error(
          `[Paper Trading] Failed to resolve positions for market ${resolved.marketId}:`,
          error,
        );
        notifiedMarkets.current.delete(resolved.marketId);
        return;
      }

      toast.success(`Market resolved! Check your portfolio to see results.`, {
        duration: 5000,
        icon: "✅",
      });

      console.log(`[Azuro] Market ${resolved.marketId} resolved: ${resolved.result}`);
    });
  }, [
    resolutionQuery.data,
    openOrdersQuery.data?.positions,
    resolveMutation,
    queryClient,
  ]);

  return {
    isPolling: resolutionQuery.isFetching,
    lastChecked: resolutionQuery.data?.checkedAt,
  };
}
