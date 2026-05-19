import { getApiBaseUrl } from "~/lib/predictioApi";
import type { SeedMarket } from "~/data/seedMarkets";
import { getSportMetadata } from "~/data/mockMarkets";
import type { AzuroMarket } from "~/services/azuro";
import { transformAzuroThreeWayOdds } from "~/utils/azuroThreeWayOdds";
import {
  CURATED_FEATURED_MAX,
  curateFeaturedAzuroMarkets,
  rankAzuroMarketsByCurationScore,
} from "~/lib/markets/curateFeaturedEvents";
import { compareEditorialCatalogOrder } from "~/lib/editorialCatalogOrder";
import { logFrontendFetchForensic } from "~/lib/homePipelineForensicTrace";
import { buildFootballFirstHomepageView } from "~/lib/footballFirstView";
import { filterValidAzuroMarketsForView } from "~/lib/marketViewSafety";

/** Quota pareggio sintetica se Azuro/API non espone draw (calcio 1X2 sempre 3 esiti in UI). */
const SYNTHETIC_DRAW_DECIMAL = 3.35;

/** Row shape from Express `GET /api/markets` (see `backend/src/routes/adminCuration.ts`). */
export type CuratedMarketApiRow = {
  id: string;
  gameId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  homeImage: string | null;
  awayImage: string | null;
  leagueName: string;
  country: string;
  startsAt: string;
  lockedAt: string;
  status: string;
  result: string | null;
  timeToLock: number;
  importanceScore: number;
  autoPublish: boolean;
  homeOdds?: number | null;
  drawOdds?: number | null;
  awayOdds?: number | null;
  paperLiquidityAllocation?: number | null;
  paperLiquiditySharePct?: number | null;
  editorialSlot?:
    | "premiumAnchors"
    | "italyFirst"
    | "unionBerlin"
    | "tennisPremium"
    | "basketballPremium"
    | "motorsportCombat"
    | "adaptiveFallback";
  selectionReason?: string;
  sport?: string;
  sportSlug?: string;
};

function slugifyCompetition(name: string | undefined | null): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "league";
}

function deriveSeedStatus(row: CuratedMarketApiRow): SeedMarket["status"] {
  const st = String(row.status || "OPEN").toUpperCase();
  if (st === "RESOLVED") return "resolved";
  if (st === "LOCKED") return "locked";
  const starts = new Date(row.startsAt).getTime();
  const locked = new Date(row.lockedAt).getTime();
  const now = Date.now();
  if (now >= locked) return "live";
  if (now >= starts) return "live";
  const hoursToLock = (locked - now) / (1000 * 60 * 60);
  if (hoursToLock > 0 && hoursToLock <= 24) return "ending-soon";
  return "upcoming";
}

export function curatedApiRowToAzuroMarket(row: CuratedMarketApiRow): AzuroMarket {
  const startsAt = row.startsAt;
  const endsAt = row.lockedAt;
  const slug = slugifyCompetition(row.leagueName);

  const ho = row.homeOdds;
  const doo = row.drawOdds;
  const ao = row.awayOdds;

  const homeOk = ho != null && ho > 0;
  const awayOk = ao != null && ao > 0;
  const drawOk = doo != null && doo > 0;

  let outcomes: SeedMarket["outcomes"];
  let drawOddsField: string;

  if (homeOk && awayOk) {
    const drawDec = drawOk ? doo! : SYNTHETIC_DRAW_DECIMAL;
    const t = transformAzuroThreeWayOdds(String(ho), String(drawDec), String(ao));
    drawOddsField = drawOk ? doo!.toFixed(2) : SYNTHETIC_DRAW_DECIMAL.toFixed(2);
    outcomes = [
      { id: `${row.gameId}-home`, label: row.homeTeam, price: t.home, volume24h: 0 },
      { id: `${row.gameId}-draw`, label: "Pareggio", price: t.draw, volume24h: 0 },
      { id: `${row.gameId}-away`, label: row.awayTeam, price: t.away, volume24h: 0 },
    ];
  } else {
    drawOddsField = "3.00";
    outcomes = [
      { id: `${row.gameId}-home`, label: row.homeTeam, price: 1 / 3, volume24h: 0 },
      { id: `${row.gameId}-draw`, label: "Pareggio", price: 1 / 3, volume24h: 0 },
      { id: `${row.gameId}-away`, label: row.awayTeam, price: 1 / 3, volume24h: 0 },
    ];
  }

  const sportKey = row.sportSlug ?? row.sport ?? "unknown";
  const sportMeta = getSportMetadata(sportKey);
  const competition = String(row.leagueName ?? row.title ?? "unknown").trim() || "unknown";

  return {
    id: row.id,
    question: `${row.homeTeam} vs ${row.awayTeam}`,
    sport: sportKey,
    sportEmoji: sportMeta.emoji,
    competition,
    competitionSlug: slug,
    event: {
      name: row.title || `${row.homeTeam} vs ${row.awayTeam}`,
      slug: `${slug}-${row.gameId}`.slice(0, 80),
      startsAt,
      lockedAt: row.lockedAt,
      teams: [row.homeTeam, row.awayTeam],
      location: row.country,
    },
    outcomes,
    volume24h: 0,
    liquidity:
      typeof row.paperLiquidityAllocation === "number" &&
      row.paperLiquidityAllocation > 0
        ? row.paperLiquidityAllocation
        : 0,
    traders: 0,
    status: deriveSeedStatus(row),
    createdAt: startsAt,
    creator: "predictio",
    resolutionSources: [],
    endsAt,
    isFeatured: false,
    azuroGameId: row.gameId,
    azuroStatus: row.status,
    azuroResult: row.result ?? undefined,
    importanceScore: row.importanceScore,
    editorialSlot: row.editorialSlot,
    selectionReason: row.selectionReason,
    drawOdds: drawOddsField,
    paperLiquidityAllocation: row.paperLiquidityAllocation ?? null,
    paperLiquiditySharePct: row.paperLiquiditySharePct ?? null,
  };
}

function kickoffMsForSort(m: AzuroMarket): number {
  const s = m.event?.startsAt;
  if (s) {
    const t = Date.parse(s);
    if (Number.isFinite(t)) return t;
  }
  const e = Date.parse(m.endsAt);
  return Number.isFinite(e) ? e : Number.MAX_SAFE_INTEGER;
}

/** Backend canonical order: editorial slot bands, then appeal, then kickoff. */
export function sortByBackendCuratedRanking(markets: AzuroMarket[]): AzuroMarket[] {
  return [...markets].sort((a, b) =>
    compareEditorialCatalogOrder(
      {
        editorialSlot: a.editorialSlot,
        importanceScore: a.importanceScore,
        startsAtMs: kickoffMsForSort(a),
      },
      {
        editorialSlot: b.editorialSlot,
        importanceScore: b.importanceScore,
        startsAtMs: kickoffMsForSort(b),
      },
    ),
  );
}

/** Public GET /api/markets (≤9 rows with scores) — skip client balance re-curation. */
function shouldUseBackendCuratedPassThrough(markets: AzuroMarket[]): boolean {
  if (markets.length === 0 || markets.length > CURATED_FEATURED_MAX) return false;
  return markets.every(
    (m) => typeof m.importanceScore === "number" && Number.isFinite(m.importanceScore),
  );
}

function logCuratedRankingPath(path: "backend-pass-through" | "featured-recuration"): void {
  if (!import.meta.env.DEV) return;
  const msg =
    path === "backend-pass-through"
      ? "[curatedMarketsApi] frontend using backend curated ranking"
      : "[curatedMarketsApi] frontend applying featured recuration";
  console.debug(msg);
}

export { isCanonicalCuratedCatalog } from "~/lib/curatedMarketPresentation";

const HOMEPAGE_MIN_MARKETS = 9;

export async function fetchCuratedMarketsFromApi(): Promise<{
  markets: AzuroMarket[];
  total: number;
  source: "curated-api" | "empty";
  rawFeedMode?: boolean;
  protocolRegistryMode?: boolean;
}> {
  try {
    const base = getApiBaseUrl().replace(/\/$/, "");
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 6_000);
    const res = await fetch(`${base}/api/markets`, { signal: ac.signal });
    clearTimeout(t);
    if (!res.ok) {
      throw new Error(`GET /api/markets failed (${res.status})`);
    }
    const data = (await res.json()) as {
      markets: CuratedMarketApiRow[];
      total: number;
      rawFeedMode?: boolean;
      protocolRegistryMode?: boolean;
      inventoryBuckets?: Record<string, number>;
      footballCount?: number;
    };
    const mapped = filterValidAzuroMarketsForView(
      (data.markets ?? []).map(curatedApiRowToAzuroMarket),
      "fetchCuratedMarketsFromApi",
    );
    const registryView = Boolean(data.protocolRegistryMode ?? data.rawFeedMode);

    if (registryView) {
      const preview = buildFootballFirstHomepageView(
        mapped,
        HOMEPAGE_MIN_MARKETS,
        HOMEPAGE_MIN_MARKETS,
      );
      const footballCount = preview.filter(
        (m) => m.sport === "football" || m.sport === "soccer",
      ).length;
      logFrontendFetchForensic({
        apiTotal: data.total ?? mapped.length,
        rawFeedMode: true,
        source: "curated-api",
        markets: preview,
        rankingPath: "football-first-view-min-9",
      });
      console.log(
        JSON.stringify({
          tag: "HOME_PIPELINE_PROTOCOL_VIEW",
          API_RESPONSE_COUNT: mapped.length,
          FRONTEND_FETCH_COUNT: mapped.length,
          HOMEPAGE_PREVIEW_COUNT: preview.length,
          FOOTBALL_HOMEPAGE_COUNT: footballCount,
          HOMEPAGE_MIN: HOMEPAGE_MIN_MARKETS,
          INVENTORY_BUCKETS: data.inventoryBuckets ?? null,
          FOOTBALL_COUNT: data.footballCount ?? footballCount,
        }),
      );
      return {
        markets: mapped,
        total: data.total ?? mapped.length,
        source: "curated-api",
        rawFeedMode: true,
        protocolRegistryMode: true,
      };
    }

    let markets: AzuroMarket[];
    let rankingPath: string;
    if (shouldUseBackendCuratedPassThrough(mapped)) {
      logCuratedRankingPath("backend-pass-through");
      rankingPath = "backend-pass-through";
      markets = sortByBackendCuratedRanking(mapped);
    } else {
      logCuratedRankingPath("featured-recuration");
      rankingPath = "featured-recuration";
      const featured = curateFeaturedAzuroMarkets(mapped, { limit: CURATED_FEATURED_MAX });
      markets =
        featured.length > 0
          ? featured
          : rankAzuroMarketsByCurationScore(mapped).slice(0, CURATED_FEATURED_MAX);
    }
    if (markets.length === 0) {
      logFrontendFetchForensic({
        apiTotal: 0,
        rawFeedMode: false,
        source: "empty",
        markets: [],
        rankingPath,
      });
      return {
        markets: [],
        total: 0,
        source: "empty",
      };
    }
    logFrontendFetchForensic({
      apiTotal: data.total ?? markets.length,
      rawFeedMode: false,
      source: "curated-api",
      markets,
      rankingPath,
    });
    return {
      markets,
      total: data.total ?? markets.length,
      source: "curated-api",
    };
  } catch {
    return {
      markets: [],
      total: 0,
      source: "empty",
    };
  }
}
