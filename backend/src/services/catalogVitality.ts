/**
 * Catalog vitality — filter stale/orphan markets, prioritize upcoming football (PR18).
 */
import type { PrismaClient } from "@prisma/client";
import { computeMarketPriorityScore } from "./marketPriorityEngine";
import { retireStaleMarketsAndCatalog } from "./staleMarketRetirement";

const TOP_LEAGUE_RE =
  /premier league|champions league|uefa|serie a|la liga|laliga|bundesliga|ligue 1|eredivisie|europa league/i;

let lastRetirementMs = 0;
const RETIREMENT_THROTTLE_MS = 120_000;

export async function maybeRunStaleRetirement(prisma: PrismaClient): Promise<void> {
  const now = Date.now();
  if (now - lastRetirementMs < RETIREMENT_THROTTLE_MS) return;
  lastRetirementMs = now;
  try {
    const r = await retireStaleMarketsAndCatalog(prisma);
    if (r.marketsClosed + r.curatedLocked + r.curatedDeactivated > 0) {
      console.log(JSON.stringify({ tag: "catalog_vitality_retirement", ...r }));
    }
  } catch (e) {
    console.warn("[catalogVitality] retirement skipped:", e instanceof Error ? e.message : e);
  }
}

export function isTradableKickoff(closesAt: Date, nowMs = Date.now()): boolean {
  return closesAt.getTime() > nowMs;
}

export function isUpcomingCuratedRow(
  row: { startsAt: Date; lockedAt: Date },
  nowMs = Date.now(),
): boolean {
  return row.lockedAt.getTime() > nowMs && row.startsAt.getTime() > nowMs - 3_600_000;
}

export function marketPriorityFromRow(row: {
  id: string;
  event: string;
  league: string;
  closesAt: Date;
  volume: number;
  predictions: number;
  status: string;
}): number {
  const kickoffMs = row.closesAt.getTime();
  const leagueBoost = TOP_LEAGUE_RE.test(row.league) || TOP_LEAGUE_RE.test(row.event) ? 1.6 : 1;
  const base = computeMarketPriorityScore({
    marketId: row.id,
    kickoffMs,
    leagueName: row.league,
    volume24h: row.volume,
    traderCount: row.predictions,
    isTradable: row.status === "open" && kickoffMs > Date.now(),
    isOrphan: row.status === "open" && kickoffMs <= Date.now() - 6 * 3_600_000,
  });
  return base * leagueBoost;
}

export type CuratedRowLike = {
  gameId: string;
  title: string;
  leagueName: string;
  startsAt: Date;
  lockedAt: Date;
  importanceScore: number;
  homeTeam: string;
  awayTeam: string;
};

export function priorityForCuratedRow(row: CuratedRowLike, nowMs = Date.now()): number {
  let score = computeMarketPriorityScore({
    marketId: `azuro-${row.gameId}`,
    kickoffMs: row.startsAt.getTime(),
    leagueName: row.leagueName,
    isTradable: isUpcomingCuratedRow(row, nowMs),
  });
  if (TOP_LEAGUE_RE.test(row.leagueName) || TOP_LEAGUE_RE.test(row.title)) {
    score *= 1.5;
  }
  score += Math.min(5, (row.importanceScore ?? 0) / 20);
  return score;
}

export function sortCuratedByVitality<T extends CuratedRowLike>(rows: T[]): T[] {
  const now = Date.now();
  return [...rows]
    .filter((r) => isUpcomingCuratedRow(r, now))
    .sort((a, b) => priorityForCuratedRow(b, now) - priorityForCuratedRow(a, now));
}

export function sortMarketsByVitality<
  T extends {
    id: string;
    event: string;
    league: string;
    closesAt: Date;
    volume: number;
    predictions: number;
    status: string;
  },
>(markets: T[]): T[] {
  const now = Date.now();
  return [...markets]
    .filter((m) => {
      if (m.status !== "open") return false;
      if (!m.id.startsWith("azuro-")) return false;
      return isTradableKickoff(m.closesAt, now);
    })
    .sort((a, b) => marketPriorityFromRow(b) - marketPriorityFromRow(a));
}
