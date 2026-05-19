/**
 * Public catalog fetch — delegates to PR24 canonical inventory API.
 */
import {
  fetchCanonicalInventory,
  type InventoryFetchMode,
} from "~/lib/inventory/fetchCanonicalInventory";
import type { AzuroMarket } from "~/services/azuro";
import { buildFootballFirstHomepageView } from "~/lib/footballFirstView";
import { logFrontendFetchForensic } from "~/lib/homePipelineForensicTrace";

export type { CuratedMarketApiRow } from "~/utils/curatedMarketsApiCore";
export {
  curatedApiRowToAzuroMarket,
  sortByBackendCuratedRanking,
} from "~/utils/curatedMarketsApiCore";

const HOMEPAGE_MIN_MARKETS = 9;

export { isCanonicalCuratedCatalog } from "~/lib/curatedMarketPresentation";

export async function fetchCuratedMarketsFromApi(opts?: {
  mode?: InventoryFetchMode;
}): Promise<{
  markets: AzuroMarket[];
  total: number;
  catalogTotal: number;
  source: "curated-api" | "empty";
  rawFeedMode?: boolean;
  protocolRegistryMode?: boolean;
  inventoryBuckets?: Record<string, number>;
  footballCount?: number;
}> {
  const mode = opts?.mode ?? "discovery";
  const result = await fetchCanonicalInventory(mode);

  if (result.markets.length === 0) {
    logFrontendFetchForensic({
      apiTotal: 0,
      rawFeedMode: result.rawFeedMode ?? false,
      source: "empty",
      markets: [],
      rankingPath: result.source,
    });
    return {
      markets: [],
      total: 0,
      catalogTotal: 0,
      source: "empty",
    };
  }

  if (result.rawFeedMode && mode === "discovery") {
    buildFootballFirstHomepageView(result.markets, HOMEPAGE_MIN_MARKETS, HOMEPAGE_MIN_MARKETS);
  }

  logFrontendFetchForensic({
    apiTotal: result.catalogTotal,
    rawFeedMode: result.rawFeedMode ?? false,
    source: "curated-api",
    markets: result.markets,
    rankingPath: result.source,
  });

  return {
    markets: result.markets,
    total: result.total,
    catalogTotal: result.catalogTotal,
    source: "curated-api",
    rawFeedMode: result.rawFeedMode,
    protocolRegistryMode: result.protocolRegistryMode,
    inventoryBuckets: result.inventoryBuckets,
    footballCount: result.footballCount,
  };
}

export type { InventoryFetchMode };
