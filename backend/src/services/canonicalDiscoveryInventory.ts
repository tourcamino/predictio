/**
 * PR24 — Canonical discovery inventory (30–50 high-quality football fixtures).
 * Single source for homepage, /markets, and trading discovery surfaces.
 */
import type { CurationGamePayload } from "./eventCurationPipeline";
import {
  classifyInventoryBucket,
  computeInventoryBucketCounts,
  type InventoryBucketId,
} from "./inventoryBuckets";
import { priorityForPipelineGame } from "./rawFeedCatalogApi";
import { europeanLeagueTier, isMajorTournamentLeague } from "./marketPriorityEngine";
import { isFootballSportSlug } from "./canonicalSportTaxonomy";

export type DiscoveryFilterReason =
  | "not_football"
  | "kickoff_past_stale"
  | "bucket_cap"
  | "dedupe"
  | "quality_rank_cut";

export type DiscoveryBuildResult = {
  games: CurationGamePayload[];
  bucketCounts: ReturnType<typeof computeInventoryBucketCounts>;
  filteredOut: Partial<Record<DiscoveryFilterReason, number>>;
  pipelineCount: number;
  footballPipelineCount: number;
  discoveryCount: number;
};

const BUCKET_LIMITS: Partial<Record<InventoryBucketId, number>> = {
  LIVE_NOW: 8,
  STARTING_SOON: 10,
  NEXT_24H: 12,
  NEXT_72H: 12,
  THIS_WEEK: 10,
  THIS_MONTH: 5,
  MAJOR_EVENTS: 5,
};

const MAX_DISCOVERY = Number(process.env.PREDICTIO_DISCOVERY_MAX ?? "50") || 50;
const MIN_DISCOVERY = Number(process.env.PREDICTIO_DISCOVERY_MIN ?? "20") || 20;

function isStalePastKickoff(game: CurationGamePayload, nowMs: number): boolean {
  const kickoffMs = game.startsAtUnix * 1000;
  const hoursPast = (nowMs - kickoffMs) / 3_600_000;
  return hoursPast > 3 && game.status !== "LIVE";
}

function qualityScore(game: CurationGamePayload, nowMs: number): number {
  let score = priorityForPipelineGame(game, nowMs);
  const tier = europeanLeagueTier(game.leagueName);
  if (tier === "anchor") score += 15;
  else if (tier === "top") score += 8;
  else if (tier === "low") score -= 5;
  if (isMajorTournamentLeague(game.leagueName)) score += 6;
  return score;
}

export function buildCanonicalDiscoveryInventory(
  pipelineGames: CurationGamePayload[],
  nowMs = Date.now(),
): DiscoveryBuildResult {
  const filteredOut: Partial<Record<DiscoveryFilterReason, number>> = {};
  const bump = (r: DiscoveryFilterReason) => {
    filteredOut[r] = (filteredOut[r] ?? 0) + 1;
  };

  const football = pipelineGames.filter((g) => {
    if (!isFootballSportSlug(g.sportSlug) && !isFootballSportSlug(g.sport)) {
      bump("not_football");
      return false;
    }
    if (isStalePastKickoff(g, nowMs)) {
      bump("kickoff_past_stale");
      return false;
    }
    return true;
  });

  const ranked = [...football].sort(
    (a, b) => qualityScore(b, nowMs) - qualityScore(a, nowMs),
  );

  const bucketFilled: Partial<Record<InventoryBucketId, number>> = {};
  const seen = new Set<string>();
  const picked: CurationGamePayload[] = [];

  const tryPick = (game: CurationGamePayload, bucket: InventoryBucketId): boolean => {
    const gid = game.gameId;
    if (seen.has(gid)) {
      bump("dedupe");
      return false;
    }
    const cap = BUCKET_LIMITS[bucket] ?? 999;
    const filled = bucketFilled[bucket] ?? 0;
    if (filled >= cap) {
      bump("bucket_cap");
      return false;
    }
    seen.add(gid);
    bucketFilled[bucket] = filled + 1;
    picked.push(game);
    return true;
  };

  for (const game of ranked) {
    if (picked.length >= MAX_DISCOVERY) break;
    const bucket = classifyInventoryBucket(
      {
        kickoffMs: game.startsAtUnix * 1000,
        leagueName: game.leagueName,
        status: game.status,
        isLive: game.status === "LIVE",
      },
      nowMs,
    );
    tryPick(game, bucket);
    if (isMajorTournamentLeague(game.leagueName)) {
      tryPick(game, "MAJOR_EVENTS");
    }
  }

  if (picked.length < MIN_DISCOVERY) {
    for (const game of ranked) {
      if (picked.length >= MAX_DISCOVERY) break;
      if (seen.has(game.gameId)) continue;
      seen.add(game.gameId);
      picked.push(game);
    }
  }

  if (picked.length < ranked.length) {
    filteredOut.quality_rank_cut = ranked.length - picked.length;
  }

  const bucketCounts = computeInventoryBucketCounts(
    picked.map((g) => ({
      kickoffMs: g.startsAtUnix * 1000,
      leagueName: g.leagueName,
      status: g.status,
      isLive: g.status === "LIVE",
    })),
    nowMs,
  );

  return {
    games: picked,
    bucketCounts,
    filteredOut,
    pipelineCount: pipelineGames.length,
    footballPipelineCount: football.length,
    discoveryCount: picked.length,
  };
}

export function logDiscoveryInventoryMetrics(
  result: DiscoveryBuildResult,
  extra: Record<string, unknown> = {},
): void {
  console.log(
    JSON.stringify({
      tag: "CANONICAL_DISCOVERY_INVENTORY",
      PIPELINE_COUNT: result.pipelineCount,
      FOOTBALL_COUNT: result.footballPipelineCount,
      DISCOVERY_COUNT: result.discoveryCount,
      API_MARKETS_COUNT: result.discoveryCount,
      NEXT24_COUNT: result.bucketCounts.NEXT_24H,
      NEXT72_COUNT: result.bucketCounts.NEXT_72H,
      THIS_WEEK_COUNT: result.bucketCounts.THIS_WEEK,
      MAJOR_COUNT: result.bucketCounts.MAJOR_EVENTS,
      LIVE_NOW_COUNT: result.bucketCounts.LIVE_NOW,
      FILTERED_OUT: result.filteredOut,
      ...extra,
    }),
  );
}
