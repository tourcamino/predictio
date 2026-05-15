import type { SeedMarket } from "~/data/seedMarkets";
import type { AzuroMarket } from "~/services/azuro";
import { CURATED_FEATURED_MAX } from "~/lib/markets/curateFeaturedEvents";

import { CURATED_MARKET_ROUTING_LABEL } from "~/lib/protocolLiquidityMode";

export const CURATED_PROTOCOL_FOOTER_LABEL = CURATED_MARKET_ROUTING_LABEL;

/** Curated catalog rows from GET /api/markets carry appeal scores. */
export function isCuratedCatalogMarket(market: {
  importanceScore?: number | null;
}): boolean {
  return (
    typeof market.importanceScore === "number" && Number.isFinite(market.importanceScore)
  );
}

/** Neutral pool for paper price-impact math when no real depth exists. */
export const PAPER_ROUTING_IMPACT_POOL_USDC = 12_000;

export type CuratedCatalogMarket = SeedMarket | AzuroMarket;

/** Public curated catalog from GET /api/markets (≤9, appeal scores). */
export function isCanonicalCuratedCatalog(markets: CuratedCatalogMarket[]): boolean {
  if (markets.length === 0 || markets.length > CURATED_FEATURED_MAX) return false;
  return markets.every(
    (m) => typeof m.importanceScore === "number" && Number.isFinite(m.importanceScore),
  );
}

function marketVolume(market: CuratedCatalogMarket): number {
  if ("volume24h" in market && typeof market.volume24h === "number") return market.volume24h;
  const legacy = market as { volume?: number };
  return legacy.volume ?? 0;
}

/** Real paper/social metrics — curated API rows ship with zeros until trades exist. */
export function hasRealMarketSocialMetrics(market: CuratedCatalogMarket): boolean {
  return marketVolume(market) > 0 && (market.traders ?? 0) > 0;
}

export function shouldShowCuratedProtocolFooter(market: CuratedCatalogMarket): boolean {
  return !hasRealMarketSocialMetrics(market);
}
