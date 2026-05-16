import { useQuery } from "@tanstack/react-query";
import { useTRPCClient } from "~/trpc/react";
import { useWallet } from "~/store/useWalletStore";
import { clientChainScopeForTrpc, normalizeWalletForQuery } from "~/utils/walletQuery";
import {
  expressGetUserPositions,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";

export type UserPositionsStatus = "all" | "open" | "closed" | "resolved";
export type UserPositionsData = inferRouterOutputs<AppRouter>["getUserPositions"];

/**
 * Canonical prediction rows for a wallet — same DB as Express paper writes on production.
 */
export function useUserPositions(options: {
  /** Defaults to connected wallet; pass another address for analyst/copy views. */
  walletAddress?: string;
  status?: UserPositionsStatus;
  enabled?: boolean;
  refetchInterval?: number | false;
}) {
  const { address, chainId, isConnected } = useWallet();
  const walletKey = normalizeWalletForQuery(options.walletAddress ?? address);
  const chainScope = clientChainScopeForTrpc(chainId);
  const status = options.status ?? "all";
  const useExpress = shouldUseExpressForWalletCritical();
  const trpcClient = useTRPCClient();
  const enabled =
    (options.enabled ?? true) &&
    Boolean(walletKey) &&
    (options.walletAddress ? true : isConnected);

  return useQuery({
    queryKey: [
      "getUserPositions",
      walletKey ?? "",
      status,
      chainScope,
      useExpress ? "express" : "trpc",
    ] as const,
    enabled,
    staleTime: 15_000,
    refetchInterval: options.refetchInterval,
    queryFn: async (): Promise<UserPositionsData> => {
      const w = walletKey!;
      if (useExpress) {
        const out = await expressGetUserPositions(w, status);
        return { positions: out.positions as UserPositionsData["positions"] };
      }
      return trpcClient.getUserPositions.query({
        walletAddress: w,
        status,
        clientChainId: chainScope,
      });
    },
  });
}
