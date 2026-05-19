/**
 * PR20 — Map pipeline registry payload → public /api/markets (no DB round-trip collapse).
 */
import type { CurationGamePayload } from "./eventCurationPipeline";
import { getTemporalBandForUnix } from "./eventCurationPipeline";
import { inferEditorialSlotForFixture } from "./editorialCatalogOrchestrator";
import { computeMarketPriorityScore } from "./marketPriorityEngine";

export type PublicCatalogMarket = {
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
  sport: string;
  sportSlug: string;
  temporalBand: "SOON" | "MID" | "LATER";
  editorialSlot: string;
  selectionReason: string;
  homeOdds: number | null;
  drawOdds: number | null;
  awayOdds: number | null;
  paperLiquidityAllocation: number | null;
  paperLiquiditySharePct: number | null;
};

export function priorityForPipelineGame(game: CurationGamePayload, nowMs = Date.now()): number {
  const kickoffMs = game.startsAtUnix * 1000;
  const isLive = game.status === "LIVE";
  let score = computeMarketPriorityScore({
    marketId: `azuro-${game.gameId}`,
    kickoffMs,
    leagueName: game.leagueName,
    isTradable: kickoffMs > nowMs || isLive,
    isLive,
  });
  const hoursUntil = (kickoffMs - nowMs) / 3_600_000;
  if (hoursUntil > 720) score *= 0.25;
  else if (hoursUntil > 168) score *= 0.6;
  return score;
}

export function sortPipelineGamesByVitality(games: CurationGamePayload[]): CurationGamePayload[] {
  const now = Date.now();
  return [...games].sort(
    (a, b) => priorityForPipelineGame(b, now) - priorityForPipelineGame(a, now),
  );
}

export function mapCurationGamesToPublicMarkets(
  games: CurationGamePayload[],
  opts: {
    nowMs?: number;
    allocationByMarketId?: Record<string, { allocation: number; percentage: number }>;
  } = {},
): PublicCatalogMarket[] {
  const nowMs = opts.nowMs ?? Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const alloc = opts.allocationByMarketId ?? {};

  return games.map((g) => {
    const kickoffMs = g.startsAtUnix * 1000;
    const lockedAtMs = kickoffMs - 5 * 60 * 1000;
    const marketId = `azuro-${g.gameId}`;
    const paperLiq = alloc[marketId];
    const editorial = inferEditorialSlotForFixture({
      leagueName: g.leagueName,
      country: g.country,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      importanceScore: g.importanceScore ?? 0,
      sport: g.sport,
      sportSlug: g.sportSlug,
    });
    const isLive = g.status === "LIVE";
    return {
      id: marketId,
      gameId: g.gameId,
      title: g.title,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeImage: g.homeImage ?? null,
      awayImage: g.awayImage ?? null,
      leagueName: g.leagueName,
      country: g.country,
      startsAt: g.startsAt,
      lockedAt: new Date(lockedAtMs).toISOString(),
      status: isLive ? "LIVE" : "OPEN",
      result: null,
      timeToLock: Math.floor((lockedAtMs - nowMs) / 1000),
      importanceScore: g.importanceScore ?? 0,
      autoPublish: g.autoPublish ?? true,
      sport: g.sportSlug ?? g.sport ?? "football",
      sportSlug: g.sportSlug ?? g.sport ?? "football",
      temporalBand: g.temporalBand ?? getTemporalBandForUnix(nowSec, g.startsAtUnix),
      editorialSlot: editorial.slot,
      selectionReason: g.selectionReason ?? editorial.selectionReason,
      homeOdds: g.homeOdds ?? null,
      drawOdds: g.drawOdds ?? null,
      awayOdds: g.awayOdds ?? null,
      paperLiquidityAllocation: paperLiq?.allocation ?? null,
      paperLiquiditySharePct: paperLiq?.percentage ?? null,
    };
  });
}
