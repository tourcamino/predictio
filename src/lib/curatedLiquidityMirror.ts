import type { AzuroMarket } from "~/services/azuro";
import {
  computeCanonicalMarketAllocations,
  curatedMarketIdFromGameId,
  pickWeightSource,
  type CanonicalMarketLiquidityRow,
  type LiquidityAllocationSlot,
} from "~/server/services/canonicalLiquidityAllocation";
import { azuroMarketPassesProtocolCatalogSurface } from "~/lib/premiumCatalogStrictClient";

function gameIdFromAzuroMarket(m: AzuroMarket): string {
  const g = String(m.azuroGameId ?? "").trim();
  if (g) return g;
  return String(m.id ?? "")
    .trim()
    .replace(/^azuro-/i, "");
}

/** Same cap as homepage / canonical OPEN book. */
export const LIQUIDITY_MIRROR_CAP = 9;

/**
 * Build allocation slots from the public curated book (GET /api/markets → Azuro rows).
 * Aligns liquidity *display* with homepage when DB snapshot is empty or stale.
 */
export function liquiditySlotsFromAzuroMarkets(markets: AzuroMarket[]): LiquidityAllocationSlot[] {
  const ranked = [...markets].sort((a, b) => {
    const ia = a.importanceScore ?? 0;
    const ib = b.importanceScore ?? 0;
    if (ib !== ia) return ib - ia;
    return String(a.event?.startsAt ?? "").localeCompare(String(b.event?.startsAt ?? ""));
  });

  const surf = ranked.filter(azuroMarketPassesProtocolCatalogSurface);
  const pool = surf.length > 0 ? surf : ranked;

  return pool
    .filter((m) => m.status !== "resolved" && m.status !== "locked")
    .slice(0, LIQUIDITY_MIRROR_CAP)
    .map((m) => {
      const gid = gameIdFromAzuroMarket(m);
      const vol = (m.volume24h ?? 0) + (typeof m.liquidity === "number" ? m.liquidity : 0);
      return {
        marketId: curatedMarketIdFromGameId(gid),
        gameId: gid,
        marketName: m.event?.name?.trim() || m.question || "Match",
        league: m.competition || "—",
        sport: m.sport || "football",
        appealScore: m.importanceScore ?? 0,
        volume: vol,
      };
    })
    .filter((s) => Boolean(s.gameId));
}

export function mirrorLiquidityRowsFromMarkets(
  markets: AzuroMarket[],
  totalBudget: number,
): CanonicalMarketLiquidityRow[] {
  const slots = liquiditySlotsFromAzuroMarkets(markets);
  if (slots.length === 0 || totalBudget <= 0) return [];
  const source = pickWeightSource(slots);
  return computeCanonicalMarketAllocations(slots, totalBudget, source);
}
