import type { QueryClient } from "@tanstack/react-query";
import { invalidateWalletPortfolioLpQueries } from "~/utils/invalidateWalletPortfolioLpQueries";

/**
 * After trade / close / settlement — force canonical position reads to refresh (PR5).
 */
export function refetchCanonicalPositionReads(
  queryClient: QueryClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trpc: any,
  walletKey: string,
  marketId?: string,
) {
  invalidateWalletPortfolioLpQueries(queryClient, trpc, walletKey);

  void queryClient.refetchQueries({
    predicate: (q) => {
      const key = q.queryKey;
      if (!Array.isArray(key) || key[0] !== "getUserPositions") return false;
      return String(key[1]).toLowerCase() === walletKey.toLowerCase();
    },
  });

  if (marketId) {
    void queryClient.invalidateQueries({
      queryKey: trpc.getMarketDetail?.queryKey?.({ marketId }),
    });
    void queryClient.invalidateQueries({
      predicate: (q) => {
        try {
          return JSON.stringify(q.queryKey).includes("getMarketSummaries");
        } catch {
          return false;
        }
      },
    });
    void queryClient.invalidateQueries({
      predicate: (q) => {
        try {
          const s = JSON.stringify(q.queryKey);
          return (
            s.includes("getMarketSettlementDiagnostic") &&
            s.includes(marketId)
          );
        } catch {
          return false;
        }
      },
    });
    void queryClient.invalidateQueries({
      predicate: (q) => {
        try {
          const s = JSON.stringify(q.queryKey);
          return s.includes("getMarketProtocolTimeline") && s.includes(marketId);
        } catch {
          return false;
        }
      },
    });
  }

  void queryClient.invalidateQueries({
    predicate: (q) => {
      try {
        return JSON.stringify(q.queryKey).includes("getSettlementProtocolHealth");
      } catch {
        return false;
      }
    },
  });

  void queryClient.invalidateQueries({
    predicate: (q) => {
      try {
        return JSON.stringify(q.queryKey).includes("getProtocolPulseSnapshot");
      } catch {
        return false;
      }
    },
  });
}
