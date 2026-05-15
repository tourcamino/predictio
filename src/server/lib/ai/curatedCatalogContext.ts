/**
 * Deterministic curated catalog context for AI prompts (no RAG).
 * Reads OPEN CuratedEvent rows — same pool as public GET /api/markets and vault bridge.
 */
import { db } from "~/server/db";
import {
  MIN_TOTAL_VOLUME_FOR_VOLUME_WEIGHTS,
  VAULT_CANONICAL_MARKET_CAP,
} from "~/server/services/vaultCuratedExposureBridge";

const CACHE_TTL_MS = 60_000;

export type CuratedAiMarketRow = {
  marketId: string;
  gameId: string;
  rank: number;
  teamA: string;
  teamB: string;
  league: string;
  kickoffIso: string;
  lockIso: string;
  yesPct: number;
  noPct: number;
  drawPct?: number;
  importanceScore: number;
  observedPaperVolumeUsd: number;
};

export type CuratedCatalogForAi = {
  markets: CuratedAiMarketRow[];
  allocationMode: "curated-appeal-fallback" | "real-market-volume";
  vaultNarrative: string;
  loadedAt: number;
};

let cache: CuratedCatalogForAi | null = null;
let cacheExp = 0;

function curatedMarketId(gameId: string): string {
  return `azuro-${gameId}`;
}

function impliedTwoWay(homeOdds: number, awayOdds: number): { yesPct: number; noPct: number } {
  const ih = 1 / homeOdds;
  const ia = 1 / awayOdds;
  const t = ih + ia;
  if (t <= 0) return { yesPct: 50, noPct: 50 };
  const yes = Math.max(0.01, Math.min(0.98, ih / t));
  const no = Math.max(0.01, Math.min(0.98, ia / t));
  return { yesPct: Math.round(yes * 1000) / 10, noPct: Math.round(no * 1000) / 10 };
}

function impliedThreeWay(
  homeOdds: number,
  drawOdds: number,
  awayOdds: number,
): { yesPct: number; noPct: number; drawPct: number } {
  const ih = 1 / homeOdds;
  const id = 1 / drawOdds;
  const ia = 1 / awayOdds;
  const t = ih + id + ia;
  if (t <= 0) return { yesPct: 45, noPct: 30, drawPct: 25 };
  const yes = ih / t;
  const draw = id / t;
  const no = ia / t;
  return {
    yesPct: Math.round(yes * 1000) / 10,
    noPct: Math.round(no * 1000) / 10,
    drawPct: Math.round(draw * 1000) / 10,
  };
}

export function buildVaultExposureNarrative(
  allocationMode: CuratedCatalogForAi["allocationMode"],
): string {
  if (allocationMode === "real-market-volume") {
    return (
      "Protocol vault exposure across curated slots is weighted by observed paper trading volume per market " +
      `(aggregate paper volume ≥ $${MIN_TOTAL_VOLUME_FOR_VOLUME_WEIGHTS} on the catalog).`
    );
  }
  return (
    "Protocol vault exposure across curated slots uses editorial appeal scores (importanceScore) as weights until " +
    `aggregate paper volume reaches $${MIN_TOTAL_VOLUME_FOR_VOLUME_WEIGHTS} — pre-testnet, no live on-chain TVL claims.`
  );
}

/**
 * Load up to 9 OPEN curated markets for AI context. Cached 60s per process.
 */
export async function getCuratedCatalogForAi(): Promise<CuratedCatalogForAi> {
  const now = Date.now();
  if (cache && now < cacheExp) return cache;

  const empty: CuratedCatalogForAi = {
    markets: [],
    allocationMode: "curated-appeal-fallback",
    vaultNarrative: buildVaultExposureNarrative("curated-appeal-fallback"),
    loadedAt: now,
  };

  let rows: Array<{
    gameId: string;
    homeTeam: string;
    awayTeam: string;
    leagueName: string;
    startsAt: Date;
    lockedAt: Date;
    importanceScore: number;
    homeOdds: number | null;
    drawOdds: number | null;
    awayOdds: number | null;
  }>;

  try {
    rows = await db.curatedEvent.findMany({
      where: { isActive: true, status: "OPEN" },
      orderBy: [{ importanceScore: "desc" }, { startsAt: "asc" }],
      take: VAULT_CANONICAL_MARKET_CAP,
      select: {
        gameId: true,
        homeTeam: true,
        awayTeam: true,
        leagueName: true,
        startsAt: true,
        lockedAt: true,
        importanceScore: true,
        homeOdds: true,
        drawOdds: true,
        awayOdds: true,
      },
    });
  } catch (err) {
    console.warn(
      JSON.stringify({
        tag: "ai_catalog",
        level: "warn",
        msg: "catalog_load_failed",
        err: err instanceof Error ? err.message : String(err),
      }),
    );
    cache = empty;
    cacheExp = now + CACHE_TTL_MS;
    return empty;
  }

  const marketIds = rows.map((r) => curatedMarketId(r.gameId));
  let volumeById = new Map<string, number>();
  try {
    const paper = await db.market.findMany({
      where: { id: { in: marketIds } },
      select: { id: true, volume: true },
    });
    volumeById = new Map(paper.map((m) => [m.id, m.volume ?? 0]));
  } catch {
    /* optional paper volume — AI must not invent if missing */
  }

  const markets: CuratedAiMarketRow[] = rows.map((row, idx) => {
    const marketId = curatedMarketId(row.gameId);
    const ho = row.homeOdds;
    const ao = row.awayOdds;
    const doo = row.drawOdds;
    let yesPct = 50;
    let noPct = 50;
    let drawPct: number | undefined;
    if (ho != null && ao != null && ho > 0 && ao > 0) {
      if (doo != null && doo > 0) {
        const t = impliedThreeWay(ho, doo, ao);
        yesPct = t.yesPct;
        noPct = t.noPct;
        drawPct = t.drawPct;
      } else {
        const t = impliedTwoWay(ho, ao);
        yesPct = t.yesPct;
        noPct = t.noPct;
      }
    }

    return {
      marketId,
      gameId: row.gameId,
      rank: idx + 1,
      teamA: row.homeTeam,
      teamB: row.awayTeam,
      league: row.leagueName,
      kickoffIso: row.startsAt.toISOString(),
      lockIso: row.lockedAt.toISOString(),
      yesPct,
      noPct,
      drawPct,
      importanceScore: row.importanceScore ?? 0,
      observedPaperVolumeUsd: volumeById.get(marketId) ?? 0,
    };
  });

  const totalVol = markets.reduce((s, m) => s + m.observedPaperVolumeUsd, 0);
  const allocationMode: CuratedCatalogForAi["allocationMode"] =
    totalVol >= MIN_TOTAL_VOLUME_FOR_VOLUME_WEIGHTS
      ? "real-market-volume"
      : "curated-appeal-fallback";

  const loaded: CuratedCatalogForAi = {
    markets,
    allocationMode,
    vaultNarrative: buildVaultExposureNarrative(allocationMode),
    loadedAt: now,
  };

  cache = loaded;
  cacheExp = now + CACHE_TTL_MS;
  return loaded;
}

/** Compact block appended to system prompts (chat + optional insight). */
export function buildCuratedCatalogContextBlock(catalog: CuratedCatalogForAi): string {
  if (catalog.markets.length === 0) {
    return [
      "ACTIVE CURATED CATALOG: (none loaded — pre-testnet; up to 9 football markets when curation is live).",
      "Do not invent match names, volumes, traders, TVL, or APY.",
    ].join("\n");
  }

  const lines = catalog.markets.map((m) => {
    const draw =
      m.drawPct != null ? ` DRAW~${m.drawPct.toFixed(1)}%` : "";
    const vol =
      m.observedPaperVolumeUsd > 0
        ? ` paperVol~$${Math.round(m.observedPaperVolumeUsd)}`
        : "";
    return (
      `#${m.rank} id=${m.marketId} ${m.teamA} vs ${m.teamB} | ${m.league} | ` +
      `kickoff=${m.kickoffIso} | YES~${m.yesPct.toFixed(1)}% NO~${m.noPct.toFixed(1)}%${draw} | ` +
      `appeal=${m.importanceScore}${vol}`
    );
  });

  return [
    `ACTIVE CURATED CATALOG (${catalog.markets.length} markets, football-first, pre-testnet paper USDC):`,
    ...lines,
    `VAULT EXPOSURE: ${catalog.vaultNarrative}`,
    "Rules: only cite teams/leagues/odds from this list or the user's message. Never claim surging volume, trader counts, live on-chain liquidity, or guaranteed APY unless explicitly in this block.",
  ].join("\n");
}

export function findCatalogRow(
  catalog: CuratedCatalogForAi,
  marketId?: string,
  teamA?: string,
  teamB?: string,
): CuratedAiMarketRow | undefined {
  if (marketId) {
    const byId = catalog.markets.find((m) => m.marketId === marketId);
    if (byId) return byId;
  }
  if (teamA && teamB) {
    const na = teamA.trim().toLowerCase();
    const nb = teamB.trim().toLowerCase();
    return catalog.markets.find(
      (m) =>
        (m.teamA.toLowerCase() === na && m.teamB.toLowerCase() === nb) ||
        (m.teamA.toLowerCase() === nb && m.teamB.toLowerCase() === na),
    );
  }
  return undefined;
}

/** Invalidate cache after admin curation changes (optional hook). */
export function invalidateCuratedCatalogAiCache(): void {
  cache = null;
  cacheExp = 0;
}

/** Compact list for search-expand prompts (teams + leagues only). */
export function buildCuratedCatalogSearchHints(catalog: CuratedCatalogForAi): string {
  if (catalog.markets.length === 0) {
    return "ACTIVE CURATED MARKETS: (none loaded)";
  }
  const lines = catalog.markets.map(
    (m) =>
      `${m.rank}. ${m.teamA} vs ${m.teamB} | ${m.league} | id=${m.marketId}`,
  );
  return ["ACTIVE CURATED MARKETS (use these names when expanding queries):", ...lines].join(
    "\n",
  );
}
