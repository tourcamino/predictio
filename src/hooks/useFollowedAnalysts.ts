import { useQuery } from "@tanstack/react-query";
import { useTRPCClient } from "~/trpc/react";
import {
  expressGetFollowedAnalysts,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";

export type FollowedAnalystsData =
  inferRouterOutputs<AppRouter>["getFollowedAnalysts"];

export function useFollowedAnalysts(input: {
  userWallet: string;
  enabled?: boolean;
}) {
  const useExpress = shouldUseExpressForWalletCritical();
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: [
      "getFollowedAnalysts",
      input.userWallet.toLowerCase(),
      useExpress ? "express" : "trpc",
    ] as const,
    enabled: (input.enabled ?? true) && !!input.userWallet,
    staleTime: 30_000,
    queryFn: async (): Promise<FollowedAnalystsData> => {
      if (useExpress) {
        return (await expressGetFollowedAnalysts(
          input.userWallet,
        )) as FollowedAnalystsData;
      }
      return trpcClient.getFollowedAnalysts.query({
        userWallet: input.userWallet,
      });
    },
  });
}
