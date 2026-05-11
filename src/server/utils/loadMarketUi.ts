import { getMarketById, type Market } from "~/data/mockMarkets";
import { SEED_MARKETS } from "~/data/seedMarkets";
import { normalizeMarketIdParam } from "~/utils/marketId";
import { db } from "~/server/db";
import { azuroDetailToMarket } from "~/server/utils/azuroDetailToMarket";
import { curatedEventRowToUiMarket } from "~/server/utils/curatedEventToUiMarket";
import { prismaMarketToUi } from "~/server/utils/prismaMarket";
import { seedMarketToUiMarket } from "~/server/utils/seedMarketToUi";

/**
 * Resolve order: static mocks → PostgreSQL `Market` row → founder `curatedEvent` → Azuro GraphQL live.
 * Must stay aligned with `getMarketDetail` so OG images / notifications match la lista `/api/markets`.
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
    const gameId = marketId.replace(/^azuro-/, "");

    try {
      const curated = await db.curatedEvent.findFirst({
        where: {
          OR: [{ gameId }, { id: gameId }],
          isActive: true,
        },
      });
      if (curated) {
        try {
          const { fetchAzuroGameDetail } = await import("~/services/azuro");
          const azuroMarket = await fetchAzuroGameDetail(gameId);
          if (azuroMarket) return azuroDetailToMarket(azuroMarket);
        } catch {
          /* use DB row */
        }
        return curatedEventRowToUiMarket(curated, marketId);
      }
    } catch (err) {
      console.warn("[loadMarketUiById] CuratedEvent lookup skipped:", marketId, err);
    }

    try {
      const { fetchAzuroGameDetail } = await import("~/services/azuro");
      const detail = await fetchAzuroGameDetail(gameId);
      if (detail) return azuroDetailToMarket(detail);
    } catch (err) {
      console.warn("[loadMarketUiById] Azuro detail failed:", marketId, err);
    }
    return null;
  }

  return null;
}
