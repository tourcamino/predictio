import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPCClient, useTRPC } from "~/trpc/react";

/**
 * Pre-generates OG images for the top Azuro football markets in the background
 * so social previews resolve quickly when links are shared.
 */
export function OGImagePreloader() {
  const client = useTRPCClient();
  const trpc = useTRPC();

  const marketsQuery = useQuery({
    ...trpc.getAzuroMarkets.queryOptions({
      sport: "football",
      competition: "all",
      status: "all",
    }),
    staleTime: 120_000,
  });

  useEffect(() => {
    const markets = marketsQuery.data?.markets;
    if (!markets?.length) {
      return;
    }

    const ids = markets.slice(0, 5).map((m) => m.id);

    ids.forEach((marketId, index) => {
      setTimeout(() => {
        client.generateMarketOGImage
          .query({ marketId })
          .then(() => {
            console.log(`[OGImagePreloader] Generated OG image for market ${marketId}`);
          })
          .catch((error: unknown) => {
            console.warn(
              `[OGImagePreloader] Failed to generate OG image for market ${marketId}:`,
              error,
            );
          });
      }, index * 1000);
    });
  }, [client, marketsQuery.data?.markets]);

  return null;
}
