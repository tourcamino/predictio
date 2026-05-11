import { getMarketById, type Market } from "~/data/mockMarkets";
import { SEED_MARKETS } from "~/data/seedMarkets";
import { normalizeMarketIdParam } from "~/utils/marketId";
import { db } from "~/server/db";
import { azuroDetailToMarket } from "~/server/utils/azuroDetailToMarket";
import { prismaMarketToUi } from "~/server/utils/prismaMarket";
import { seedMarketToUiMarket } from "~/server/utils/seedMarketToUi";

/**
 * Resolve order: static mocks → PostgreSQL (includes synced Azuro rows) → Azuro GraphQL live.
 * Matches `getMarketDetail` so trading / OG / notifications work for all list sources.
 */
export async function loadMarketUiById(rawMarketId: string): Promise<Market | null> {
  const marketId = normalizeMarketIdParam(rawMarketId);

  const mock = getMarketById(marketId);
  if (mock) return mock;

  const seed = SEED_MARKETS.find((m) => m.id === marketId);
  if (seed) return seedMarketToUiMarket(seed);

  try {
    const row = await db.market.findUnique({
      where: { id: marketId },
    });
    if (row) return prismaMarketToUi(row);
  } catch (err) {
    console.warn("[loadMarketUiById] DB lookup skipped:", marketId, err);
  }

  if (marketId.startsWith("azuro-")) {
    try {
      const { fetchAzuroGameDetail } = await import("~/services/azuro");
      const gameId = marketId.replace(/^azuro-/, "");
      const detail = await fetchAzuroGameDetail(gameId);
      if (detail) return azuroDetailToMarket(detail);
    } catch (err) {
      console.warn("[loadMarketUiById] Azuro detail failed:", marketId, err);
    }
    return null;
  }

  return null;
}
