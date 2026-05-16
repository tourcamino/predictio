import { useQuery } from "@tanstack/react-query";
import { useTRPCClient } from "~/trpc/react";
import { normalizeWalletForQuery } from "~/utils/walletQuery";
import {
  expressGetCopyRelationship,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";

export type CopyRelationshipData =
  inferRouterOutputs<AppRouter>["getCopyRelationship"];

export function useCopyRelationship(input: {
  copierWallet: string;
  analystWallet: string;
  enabled?: boolean;
}) {
  const copier = normalizeWalletForQuery(input.copierWallet);
  const analyst = normalizeWalletForQuery(input.analystWallet);
  const useExpress = shouldUseExpressForWalletCritical();
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: [
      "getCopyRelationship",
      copier ?? "",
      analyst ?? "",
      useExpress ? "express" : "trpc",
    ] as const,
    enabled: (input.enabled ?? true) && Boolean(copier && analyst),
    queryFn: async (): Promise<CopyRelationshipData> => {
      if (useExpress) {
        return (await expressGetCopyRelationship(copier!, analyst!)) as CopyRelationshipData;
      }
      return trpcClient.getCopyRelationship.query({
        copierWallet: copier!,
        analystWallet: analyst!,
      });
    },
  });
}
