import type { Market } from "@prisma/client";
import {
  scoreCurationCandidate,
  type CurationCandidate,
} from "~/lib/markets/curateFeaturedEvents";
import {
  parseKickoff,
  parseTeamsFromEvent,
  parseYesNoPrices,
} from "~/server/utils/prismaMarket";

/** Map Prisma `Market` → scoring DTO (server-only — uses DB JSON shape). */
export function prismaMarketToCurationCandidate(row: Market): CurationCandidate {
  const { teamA, teamB } = parseTeamsFromEvent(row.event);
  const { yesPrice, noPrice } = parseYesNoPrices(row.outcomes);
  const kickoff = parseKickoff(row.outcomes, row.closesAt);
  return {
    id: row.id,
    sport: row.sport,
    leagueLabel: row.league,
    teamNames: [teamA, teamB],
    startsAtMs: kickoff.getTime(),
    closesAtMs: row.closesAt.getTime(),
    yesImplied: yesPrice,
    noImplied: noPrice,
    volume24h: row.volume,
    liquidity: row.totalLPPool ?? row.volume * 0.5,
  };
}

export function scorePrismaMarketForCuration(
  row: Market,
  nowMs = Date.now(),
): number | null {
  return scoreCurationCandidate(prismaMarketToCurationCandidate(row), nowMs);
}

/** Prefer high-signal paper markets for autonomous analysts (fails soft → sinks in list). */
export function rankPrismaMarketsByCuration(
  rows: Market[],
  nowMs = Date.now(),
): Market[] {
  return [...rows].sort((a, b) => {
    const sa = scorePrismaMarketForCuration(a, nowMs);
    const sb = scorePrismaMarketForCuration(b, nowMs);
    if (sa == null && sb == null) return 0;
    if (sa == null) return 1;
    if (sb == null) return -1;
    return sb - sa;
  });
}
