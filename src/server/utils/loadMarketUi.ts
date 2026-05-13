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
 * Resolve UI `Market` for trading and detail — Azuro-backed events plus DB `Market` snapshots.
 * Curated lookup matches Express `GET /api/markets/:gameId` (by `gameId`, `id`, or `azuro-*` URL form).
 *
 * Order: PostgreSQL `Market` → active `CuratedEvent` (+ live Azuro quote) → live Azuro only (`azuro-*`).
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

  const azuroStrip = marketId.startsWith("azuro-") ? marketId.slice("azuro-".length) : null;

  try {
    const orClause: Array<{ gameId: string } | { id: string }> = [
      { id: marketId },
      { gameId: marketId },
    ];
    if (azuroStrip) {
      orClause.push({ gameId: azuroStrip }, { id: azuroStrip });
    }

    const curated = await db.curatedEvent.findFirst({
      where: {
        isActive: true,
        OR: orClause,
      },
    });

    if (curated) {
      try {
        const azuroMarket = await fetchAzuroGameDetail(curated.gameId);
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

  if (!azuroStrip) {
    return null;
  }

  try {
    const detail = await fetchAzuroGameDetail(azuroStrip);
    if (detail) {
      return withCanonicalId(azuroDetailToMarket(detail), marketId);
    }
  } catch (err) {
    console.warn("[loadMarketUiById] Azuro detail failed:", marketId, err);
  }

  return null;
}
