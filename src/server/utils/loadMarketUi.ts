import { getMarketById, type Market } from "~/data/mockMarkets";
import { db } from "~/server/db";
import { azuroDetailToMarket } from "~/server/utils/azuroDetailToMarket";
import { prismaMarketToUi } from "~/server/utils/prismaMarket";
import { fetchAzuroGameDetail } from "~/services/azuro";

/**
 * Resolve order: static mocks → PostgreSQL (includes synced Azuro rows) → Azuro GraphQL live.
 * Matches `getMarketDetail` so trading / OG / notifications work for all list sources.
 */
export async function loadMarketUiById(marketId: string): Promise<Market | null> {
  const mock = getMarketById(marketId);
  if (mock) return mock;

  const row = await db.market.findUnique({
    where: { id: marketId },
  });
  if (row) return prismaMarketToUi(row);

  if (marketId.startsWith("azuro-")) {
    try {
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
