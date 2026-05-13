import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { normalizeMarketIdParam } from "~/utils/marketId";
import type { Market } from "~/data/mockMarkets";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";

function safeDecodeMarketIdParam(raw: string): string {
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

/** Flat history from real `priceHistory` when present; otherwise two points at current implied probs (no random mock walk). */
function buildPredictionHistory(market: Market) {
  const ph = market.priceHistory;
  if (ph && ph.length >= 2) {
    return ph.map((p) => ({
      timestamp: p.timestamp,
      percentA: Math.round(p.yesPrice * 100),
      percentB: Math.round(p.noPrice * 100),
      percentDraw: market.percentDraw,
      volume: market.volume * 0.75,
    }));
  }

  const now = Date.now();
  const pA = Math.round(market.yesPrice * 100);
  const pB = Math.round(market.noPrice * 100);
  const pD = market.percentDraw;
  return [
    {
      timestamp: new Date(now - 24 * 60 * 60 * 1000),
      percentA: pA,
      percentB: pB,
      percentDraw: pD,
      volume: market.volume * 0.5,
    },
    {
      timestamp: new Date(now),
      percentA: pA,
      percentB: pB,
      percentDraw: pD,
      volume: market.volume,
    },
  ];
}

export const getMarketDetail = baseProcedure
  .input(z.object({ marketId: z.string() }))
  .query(async ({ input }) => {
    const marketId = normalizeMarketIdParam(safeDecodeMarketIdParam(input.marketId));

    const market = await loadMarketUiById(marketId);
    if (!market) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Market not found. Only Azuro-backed events are listed.",
      });
    }

    const predictionHistory = buildPredictionHistory(market);

    const azuroGameId =
      marketId.startsWith("azuro-")
        ? marketId.replace(/^azuro-/, "")
        : market.id.startsWith("azuro-")
          ? market.id.replace(/^azuro-/, "")
          : undefined;

    return {
      market,
      predictionHistory,
      azuroData: azuroGameId
        ? {
            gameId: azuroGameId,
            conditionId: undefined,
            status: undefined,
            result: undefined,
          }
        : undefined,
    };
  });
