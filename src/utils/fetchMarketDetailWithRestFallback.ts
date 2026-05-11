import type { TRPCClient } from "@trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";
import { getApiBaseUrl } from "~/lib/predictioApi";
import { normalizeMarketIdParam } from "~/utils/marketId";
import {
  restCuratedEventToUiMarket,
  type RestCuratedEventPayload,
} from "~/utils/restCuratedEventToUiMarket";

type GetMarketDetailResult = inferRouterOutputs<AppRouter>["getMarketDetail"];

async function fetchCuratedMarketFromRest(
  normalized: string,
): Promise<GetMarketDetailResult | null> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  try {
    const res = await fetch(`${base}/api/markets/${encodeURIComponent(normalized)}`, {
      signal: ac.signal,
      credentials: "omit",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { market?: RestCuratedEventPayload };
    if (!data.market) return null;
    const market = restCuratedEventToUiMarket(data.market, normalized);
    const gameId = normalized.replace(/^azuro-/, "");
    return {
      market,
      predictionHistory: [],
      azuroData: {
        gameId,
        conditionId: undefined,
        status: undefined,
        result: undefined,
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Curated catalog rows come from Express `GET /api/markets` — load detail from the same
 * API first so the page works even when `/trpc` is unreachable. Falls back to tRPC for
 * mocks, DB-only markets, and Azuro enrichments.
 */
export async function fetchMarketDetailWithRestFallback(
  trpcClient: TRPCClient<AppRouter>,
  marketId: string,
): Promise<GetMarketDetailResult> {
  const normalized = normalizeMarketIdParam(marketId.trim());

  const fromRest = await fetchCuratedMarketFromRest(normalized);
  if (fromRest) return fromRest;

  return await trpcClient.getMarketDetail.query({ marketId });
}
