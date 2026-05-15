import { useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTRPC } from "~/trpc/react";
import { useWalletStore } from "~/store/useWalletStore";
import { invalidateAllPointsSummaryQueries } from "~/utils/invalidateWalletNotifications";
import { invalidateAllPredictionPortfolioCachesForAnyWallet } from "~/utils/invalidateWalletPortfolioLpQueries";
import { invalidateProtocolLiquidityQueries } from "~/utils/invalidateProtocolLiquidityQueries";
import { clientChainScopeForTrpc, normalizeWalletForQuery } from "~/utils/walletQuery";

/**
 * Polls Azuro for terminal / exceptional states affecting **paper DB orders** for the connected wallet.
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
  const refundMutation = useMutation(trpc.refundPaperMarket.mutationOptions());
  const disputeMutation = useMutation(trpc.disputePaperMarket.mutationOptions());

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

    resolutionQuery.data.resolvedMarkets.forEach(async (item) => {
      if (notifiedMarkets.current.has(item.marketId)) return;

      const hasOpenExposure = orders.some((o) => o.marketId === item.marketId);
      if (!hasOpenExposure) return;

      notifiedMarkets.current.add(item.marketId);

      try {
        if (item.kind === "DISPUTE") {
          await disputeMutation.mutateAsync({
            marketId: item.marketId,
            disputeReason: `Azuro: ${item.disputeReason}${item.rawState ? ` (${item.rawState})` : ""}`,
            oracleSource: "azuro_graphql",
          });
          invalidateAllPredictionPortfolioCachesForAnyWallet(queryClient);
          invalidateProtocolLiquidityQueries(queryClient, trpc);
          toast(`Market update: ${item.disputeReason} — under review`, { icon: "⚠️", duration: 6000 });
          console.log(`[Azuro] Dispute queued for ${item.marketId}: ${item.disputeReason}`);
          return;
        }

        if (item.kind === "REFUND") {
          await refundMutation.mutateAsync({
            marketId: item.marketId,
            reason: item.refundReason,
            authority: "azuro_graphql",
            oracleConditionId: item.conditionId,
            oracleObservedAt: new Date().toISOString(),
            oracleRawOutcome: item.rawState ?? item.refundReason,
          });
          invalidateAllPredictionPortfolioCachesForAnyWallet(queryClient);
          invalidateAllPointsSummaryQueries(queryClient);
          invalidateProtocolLiquidityQueries(queryClient, trpc);
          toast.success(`Stakes refunded (${item.refundReason}). Check your portfolio.`, {
            duration: 6000,
            icon: "💸",
          });
          console.log(`[Azuro] Refunded ${item.marketId}: ${item.refundReason}`);
          return;
        }

        const winningOutcome =
          item.result === "home" ? "YES" : item.result === "away" ? "NO" : null;
        if (!winningOutcome) {
          console.warn("[AzuroResolutionPolling] Unexpected binary shape:", item.marketId, item);
          notifiedMarkets.current.delete(item.marketId);
          return;
        }

        await resolveMutation.mutateAsync({
          marketId: item.marketId,
          winningOutcome,
          oracleSource: "azuro_graphql",
          oracleConditionId: item.conditionId,
          oracleObservedAt: new Date().toISOString(),
          oracleRawOutcome: item.result,
        });

        invalidateAllPredictionPortfolioCachesForAnyWallet(queryClient);
        invalidateAllPointsSummaryQueries(queryClient);
        invalidateProtocolLiquidityQueries(queryClient, trpc);

        console.log(`[Paper Trading] Resolved positions for market ${item.marketId}`);
        toast.success(`Market resolved! Check your portfolio to see results.`, {
          duration: 5000,
          icon: "✅",
        });

        console.log(`[Azuro] Market ${item.marketId} resolved: ${item.result}`);
      } catch (error) {
        console.error(
          `[Paper Trading] Failed oracle follow-up for market ${item.marketId}:`,
          error,
        );
        notifiedMarkets.current.delete(item.marketId);
      }
    });
  }, [
    resolutionQuery.data,
    openOrdersQuery.data?.positions,
    resolveMutation,
    refundMutation,
    disputeMutation,
    queryClient,
  ]);

  return {
    isPolling: resolutionQuery.isFetching,
    lastChecked: resolutionQuery.data?.checkedAt,
  };
}
