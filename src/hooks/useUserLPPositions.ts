import { useQuery } from "@tanstack/react-query";
import { useTRPCClient } from "~/trpc/react";
import {
  expressGetUserLPPositions,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";

export type UserLPPositionsData =
  inferRouterOutputs<AppRouter>["getUserLPPositions"];

export function useUserLPPositions(input: {
  walletAddress: string;
  status?: "all" | "active" | "withdrawn";
  clientChainId?: number;
  enabled?: boolean;
}) {
  const useExpress = shouldUseExpressForWalletCritical();
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: [
      "getUserLPPositions",
      input.walletAddress.toLowerCase(),
      input.status ?? "active",
      input.clientChainId ?? 0,
      useExpress ? "express" : "trpc",
    ] as const,
    enabled: (input.enabled ?? true) && !!input.walletAddress,
    staleTime: 30_000,
    queryFn: async (): Promise<UserLPPositionsData> => {
      if (useExpress) {
        return (await expressGetUserLPPositions({
          walletAddress: input.walletAddress,
          status: input.status,
        })) as UserLPPositionsData;
      }
      return trpcClient.getUserLPPositions.query({
        walletAddress: input.walletAddress,
        status: input.status ?? "active",
        clientChainId: input.clientChainId ?? 0,
      });
    },
  });
}
