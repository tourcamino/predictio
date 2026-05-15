import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "~/trpc/react";
import { getApiBaseUrl } from "~/lib/predictioApi";
import { shouldUseExpressForWalletCritical } from "~/lib/expressCriticalWalletApi";
import { invalidateProtocolLiquidityQueries } from "~/utils/invalidateProtocolLiquidityQueries";

type CatalogLiquidityVersion = {
  allocationVersion: string;
  rebalanceTriggeredAt: string;
};

async function fetchCatalogLiquidityVersionExpress(): Promise<CatalogLiquidityVersion> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  for (const path of [
    "/api/v1/web/catalog-liquidity-version",
    "/api/web/catalog-liquidity-version",
  ]) {
    const res = await fetch(`${base}${path}`, { credentials: "omit" });
    if (res.ok) return res.json() as Promise<CatalogLiquidityVersion>;
    if (res.status !== 404) break;
  }
  throw new Error("catalog-liquidity-version not available");
}

/**
 * Polls catalog liquidity version; invalidates vault/catalog caches when OPEN set changes.
 */
export function useCatalogVaultSync(enabled = true) {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const lastVersionRef = useRef<string | null>(null);
  const useExpress = shouldUseExpressForWalletCritical();

  const versionQuery = useQuery({
    queryKey: ["catalogLiquidityVersion", useExpress ? "express" : "trpc"] as const,
    enabled,
    staleTime: 0,
    refetchInterval: 25_000,
    refetchIntervalInBackground: true,
    queryFn: async (): Promise<CatalogLiquidityVersion> => {
      if (useExpress) {
        return fetchCatalogLiquidityVersionExpress();
      }
      return trpcClient.getCatalogLiquidityVersion.query({});
    },
  });

  useEffect(() => {
    const v = versionQuery.data?.allocationVersion;
    if (!v) return;
    if (lastVersionRef.current === null) {
      lastVersionRef.current = v;
      return;
    }
    if (lastVersionRef.current !== v) {
      lastVersionRef.current = v;
      invalidateProtocolLiquidityQueries(queryClient, trpc);
    }
  }, [versionQuery.data?.allocationVersion, queryClient, trpc]);

  return versionQuery;
}
