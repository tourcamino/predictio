/**
 * PR24 — Single canonical inventory fetch for all user-facing surfaces.
 */
import { getApiBaseUrl } from "~/lib/predictioApi";
import type { CuratedMarketApiRow } from "~/utils/curatedMarketsApiCore";
import {
  curatedApiRowToAzuroMarket,
  sortByBackendCuratedRanking,
} from "~/utils/curatedMarketsApiCore";
import { filterValidAzuroMarketsForView } from "~/lib/marketViewSafety";
import type { AzuroMarket } from "~/services/azuro";

export type InventoryFetchMode = "discovery" | "catalog" | "full";

export type CanonicalInventoryResult = {
  markets: AzuroMarket[];
  total: number;
  catalogTotal: number;
  source: "discovery-api" | "catalog-api" | "full-api" | "empty";
  rawFeedMode?: boolean;
  protocolRegistryMode?: boolean;
  inventoryBuckets?: Record<string, number>;
  footballCount?: number;
  filteredOut?: Record<string, number> | null;
};

const FETCH_TIMEOUT_MS: Record<InventoryFetchMode, number> = {
  discovery: 25_000,
  catalog: 35_000,
  full: 45_000,
};

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

function mapApiResponse(
  data: {
    markets: CuratedMarketApiRow[];
    total?: number;
    catalogTotal?: number;
    rawFeedMode?: boolean;
    protocolRegistryMode?: boolean;
    inventoryBuckets?: Record<string, number>;
    footballCount?: number;
    filteredOut?: Record<string, number> | null;
  },
  source: CanonicalInventoryResult["source"],
  context: string,
): CanonicalInventoryResult {
  const mapped = filterValidAzuroMarketsForView(
    (data.markets ?? []).map(curatedApiRowToAzuroMarket),
    context,
  );
  const registryView = Boolean(data.protocolRegistryMode ?? data.rawFeedMode);
  const markets = registryView ? mapped : sortByBackendCuratedRanking(mapped);

  console.log(
    JSON.stringify({
      tag: "INVENTORY_FETCH_SUCCESS",
      context,
      source,
      API_MARKETS_COUNT: data.markets?.length ?? 0,
      MAPPED_COUNT: mapped.length,
      RENDERED_COUNT: markets.length,
      FILTERED_OUT_COUNT: (data.markets?.length ?? 0) - mapped.length,
      CATALOG_TOTAL: data.catalogTotal ?? data.total ?? mapped.length,
      RAW_FEED_MODE: registryView,
      inventoryBuckets: data.inventoryBuckets ?? null,
    }),
  );

  return {
    markets,
    total: data.total ?? markets.length,
    catalogTotal: data.catalogTotal ?? data.total ?? markets.length,
    source,
    rawFeedMode: data.rawFeedMode,
    protocolRegistryMode: data.protocolRegistryMode,
    inventoryBuckets: data.inventoryBuckets,
    footballCount: data.footballCount,
    filteredOut: data.filteredOut,
  };
}

export async function fetchCanonicalInventory(
  mode: InventoryFetchMode = "discovery",
): Promise<CanonicalInventoryResult> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const timeoutMs = FETCH_TIMEOUT_MS[mode];

  try {
    if (mode === "discovery" || mode === "catalog") {
      const q = mode === "catalog" ? "?mode=catalog" : "";
      const res = await fetchWithTimeout(`${base}/api/markets/discovery${q}`, timeoutMs);
      if (!res.ok) {
        throw new Error(`GET /api/markets/discovery failed (${res.status})`);
      }
      const data = await res.json();
      return mapApiResponse(
        data,
        mode === "catalog" ? "catalog-api" : "discovery-api",
        `fetchCanonicalInventory:${mode}`,
      );
    }

    const res = await fetchWithTimeout(`${base}/api/markets`, timeoutMs);
    if (!res.ok) {
      throw new Error(`GET /api/markets failed (${res.status})`);
    }
    const data = await res.json();
    return mapApiResponse(data, "full-api", "fetchCanonicalInventory:full");
  } catch (error) {
    const reason =
      error instanceof DOMException && error.name === "AbortError"
        ? "fetch_timeout"
        : error instanceof Error
          ? error.message
          : String(error);

    console.error(
      JSON.stringify({
        tag: "INVENTORY_FETCH_FAILED",
        mode,
        FILTER_REASON: reason,
        api_empty: true,
        HOMEPAGE_MARKETS_COUNT: 0,
        MARKETS_PAGE_COUNT: 0,
      }),
    );

    if (mode !== "full") {
      console.warn("[inventory] discovery/catalog failed — falling back to full /api/markets");
      return fetchCanonicalInventory("full");
    }

    return {
      markets: [],
      total: 0,
      catalogTotal: 0,
      source: "empty",
    };
  }
}
