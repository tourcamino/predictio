/**
 * Client-side homepage pipeline forensic logs (fetchCuratedMarketsFromApi → LiveMarkets).
 * Enable: VITE_HOME_PIPELINE_FORENSIC=true or import.meta.env.DEV
 */
import type { AzuroMarket } from "~/services/azuro";

export function isHomePipelineForensicEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  const v = String(import.meta.env.VITE_HOME_PIPELINE_FORENSIC ?? "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function sportDistributionFromMarkets(
  markets: readonly AzuroMarket[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of markets) {
    const key = String(m.sport || "unknown").trim().toLowerCase() || "unknown";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function marketId(m: AzuroMarket): string {
  return String(m.azuroGameId || m.id || "").trim();
}

function marketTitle(m: AzuroMarket): string {
  return String(m.event?.name || m.question || "").trim() || marketId(m);
}

export function logFrontendFetchForensic(opts: {
  apiTotal: number;
  rawFeedMode?: boolean;
  source: string;
  markets: readonly AzuroMarket[];
  rankingPath?: string;
}): void {
  if (!isHomePipelineForensicEnabled()) return;

  console.log(
    JSON.stringify({
      tag: "HOME_PIPELINE_FRONTEND_FETCH",
      HOMEPAGE_HOOK: "LiveMarkets → useQuery → fetchCuratedMarketsFromApi",
      HOMEPAGE_ENDPOINT: "GET /api/markets (NOT getAzuroMarkets tRPC)",
      USES_AZURO_TS_SERVICE: false,
      FRONTEND_FETCH_COUNT: opts.markets.length,
      FRONTEND_FETCH_IDS: opts.markets.map(marketId),
      API_REPORTED_TOTAL: opts.apiTotal,
      RAW_FEED_MODE: opts.rawFeedMode ?? false,
      FETCH_SOURCE: opts.source,
      RANKING_PATH: opts.rankingPath ?? null,
      SPORT_DISTRIBUTION: sportDistributionFromMarkets(opts.markets),
    }),
  );
}

export function logFrontendRenderForensic(opts: {
  curatedSliceCount: number;
  intelligenceSliceCount: number;
  curatedSlice: readonly AzuroMarket[];
  intelligenceSlice: readonly AzuroMarket[];
  rawFeedMode?: boolean;
}): void {
  if (!isHomePipelineForensicEnabled()) return;

  console.log(
    JSON.stringify({
      tag: "HOME_PIPELINE_REACT_RENDER",
      HOMEPAGE_COMPONENT: "LiveMarkets",
      RAW_FEED_MODE: opts.rawFeedMode ?? false,
      CURATED_SLICE_COUNT: opts.curatedSliceCount,
      RENDERED_EVENT_COUNT: opts.intelligenceSliceCount,
      RENDERED_EVENT_IDS: opts.intelligenceSlice.map(marketId),
      CURATED_SLICE_IDS: opts.curatedSlice.map(marketId),
      SLICE_CAPS: opts.rawFeedMode
        ? { curatedSlice: 36, intelligenceSlice: 12 }
        : { curatedSlice: 9, intelligenceSlice: 5 },
      SPORT_DISTRIBUTION_RENDERED: sportDistributionFromMarkets(opts.intelligenceSlice),
      SPORT_DISTRIBUTION_POOL: sportDistributionFromMarkets(opts.curatedSlice),
      VISIBLE_LAYOUT: {
        featured: opts.intelligenceSlice[0] ? marketId(opts.intelligenceSlice[0]) : null,
        supporting: opts.intelligenceSlice.slice(1, 3).map(marketId),
        compact: opts.intelligenceSlice.slice(3, 5).map(marketId),
      },
    }),
  );

  console.log(
    JSON.stringify({
      tag: "HOME_PIPELINE_WATERFALL_CLIENT",
      FRONTEND_FETCH_COUNT: opts.curatedSliceCount,
      RENDER_COUNT: opts.intelligenceSliceCount,
      COLLAPSE_AT_RENDER:
        opts.curatedSliceCount > opts.intelligenceSliceCount
          ? `orderForHomepageIntelligence cap ${opts.rawFeedMode ? 12 : 5}`
          : opts.curatedSliceCount < 9 && !opts.rawFeedMode
            ? "API/DB ha restituito pochi eventi — collasso prima del render"
            : "nessun collasso client oltre ai cap intenzionali homepage",
    }),
  );
}
