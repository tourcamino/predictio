import type { Market } from "~/data/mockMarkets";
import { normalizeMarketIdParam } from "~/utils/marketId";
import { db } from "~/server/db";
import { azuroDetailToMarket } from "~/server/utils/azuroDetailToMarket";
import { curatedEventRowToUiMarket } from "~/server/utils/curatedEventToUiMarket";
import { prismaMarketToUi } from "~/server/utils/prismaMarket";
import { fetchAzuroGameDetail } from "~/services/azuro";

/** Ensure detail responses use the URL canonical id (Azuro payloads may use a different id). */
function withCanonicalId(m: Market, canonicalId: string): Market {
  if (m.id === canonicalId) return m;
  return { ...m, id: canonicalId };
}

/**
 * Resolve UI `Market` for trading and detail — **Azuro-backed only** (plus DB snapshots of those rows).
 * No static mock/seed fallbacks.
 *
 * Order: PostgreSQL `Market` → curated catalog + live Azuro quote → live Azuro only.
 */
export async function loadMarketUiById(rawMarketId: string): Promise<Market | null> {
  const marketId = normalizeMarketIdParam(rawMarketId);

  try {
    const row = await db.market.findUnique({
      where: { id: marketId },
    });
    if (row) return prismaMarketToUi(row);
  } catch (err) {
    console.warn("[loadMarketUiById] DB lookup skipped:", marketId, err);
  }

  if (!marketId.startsWith("azuro-")) {
    return null;
  }

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
        const azuroMarket = await fetchAzuroGameDetail(gameId);
        if (azuroMarket) {
          return withCanonicalId(azuroDetailToMarket(azuroMarket), marketId);
        }
      } catch {
        /* odds from curated row only */
      }
      return curatedEventRowToUiMarket(curated, marketId);
    }
  } catch (err) {
    console.warn("[loadMarketUiById] CuratedEvent lookup skipped:", marketId, err);
  }

  try {
    const detail = await fetchAzuroGameDetail(gameId);
    if (detail) {
      return withCanonicalId(azuroDetailToMarket(detail), marketId);
    }
  } catch (err) {
    console.warn("[loadMarketUiById] Azuro detail failed:", marketId, err);
  }

  return null;
}
