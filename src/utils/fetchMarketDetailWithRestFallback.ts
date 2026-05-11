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

/**
 * Prefer tRPC (full detail + history). If the browser cannot reach `/trpc` but REST
 * `GET /api/markets/:id` works (split deploy: SPA vs api.predictio.live), load the
 * curated row from Express and map it to the same UI market shape.
 */
export async function fetchMarketDetailWithRestFallback(
  trpcClient: TRPCClient<AppRouter>,
  marketId: string,
): Promise<GetMarketDetailResult> {
  try {
    return await trpcClient.getMarketDetail.query({ marketId });
  } catch {
    /* try REST below */
  }

  const normalized = normalizeMarketIdParam(marketId.trim());
  const base = getApiBaseUrl().replace(/\/$/, "");
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  let res: Response;
  try {
    res = await fetch(`${base}/api/markets/${encodeURIComponent(normalized)}`, {
      signal: ac.signal,
    });
  } finally {
    clearTimeout(t);
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Market not found");
    }
    throw new Error(`Impossibile caricare il mercato (API ${res.status})`);
  }

  const data = (await res.json()) as { market?: RestCuratedEventPayload };
  if (!data.market) {
    throw new Error("Risposta mercato non valida");
  }

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
}
