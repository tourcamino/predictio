/**
 * Real-data market priority scoring for catalog ranking (PR16/PR23B).
 * No fake trending — kickoff proximity, European league tiers, liquidity, activity.
 */

export type MarketPriorityInput = {
  marketId: string;
  kickoffMs: number;
  leagueName?: string;
  volume24h?: number;
  openInterestUsd?: number;
  traderCount?: number;
  recentFillCount24h?: number;
  utilizationPct?: number;
  spreadPct?: number;
  oracleState?: "prematch" | "live" | "pending" | "terminal" | "unknown";
  healthGrade?: "A" | "B" | "C" | "D" | "F";
  isTradable?: boolean;
  isOrphan?: boolean;
  isLive?: boolean;
  /** Implied yes/home price 0–1 for disagreement signal. */
  primaryOutcomePrice?: number;
};

export type EuropeanLeagueTier = "anchor" | "top" | "mid" | "low";

const ANCHOR_LEAGUE_RE =
  /premier league|champions league|uefa champions|europa league|uefa europa|world cup|euro 20|european championship|nations league|copa america|euro\b/i;

const TOP_LEAGUE_RE =
  /serie a|la liga|laliga|bundesliga|ligue 1|eredivisie|primeira liga|liga portugal|scottish premiership/i;

const MID_LEAGUE_RE =
  /championship|segunda|serie b|2\. bundesliga|ligue 2|eredivisie|super lig|jupiler|pro league|austrian bundesliga|super league|allsvenskan|veikkausliiga/i;

const LOW_LEAGUE_RE =
  /serie c|terza|fourth division|friendly|reserve|u19|u21|youth|amateur/i;

const MAJOR_TOURNAMENT_RE =
  /world cup|euro 20|european championship|champions league|uefa champions|europa league|nations league|copa america|premier league|confederations/i;

export function europeanLeagueTier(leagueName?: string): EuropeanLeagueTier {
  const n = (leagueName ?? "").trim();
  if (!n) return "low";
  if (ANCHOR_LEAGUE_RE.test(n)) return "anchor";
  if (TOP_LEAGUE_RE.test(n)) return "top";
  if (MID_LEAGUE_RE.test(n)) return "mid";
  if (LOW_LEAGUE_RE.test(n)) return "low";
  return "mid";
}

export function europeanLeagueImportance(leagueName?: string): number {
  switch (europeanLeagueTier(leagueName)) {
    case "anchor":
      return 2.2;
    case "top":
      return 1.75;
    case "mid":
      return 1.2;
    case "low":
      return 0.85;
  }
}

export function isMajorTournamentLeague(leagueName?: string): boolean {
  return MAJOR_TOURNAMENT_RE.test(leagueName ?? "");
}

export function disagreementBoost(primaryOutcomePrice?: number): number {
  if (primaryOutcomePrice == null || !Number.isFinite(primaryOutcomePrice)) return 0;
  const distFromHalf = Math.abs(primaryOutcomePrice - 0.5);
  if (distFromHalf >= 0.35) return 0;
  return (0.35 - distFromHalf) * 4;
}

export function kickoffProximityBoost(kickoffMs: number, nowMs = Date.now()): number {
  const hours = (kickoffMs - nowMs) / 3_600_000;
  if (hours < 0) return 0;
  if (hours <= 24) return 2.5;
  if (hours <= 72) return 1.8;
  if (hours <= 168) return 1.2;
  if (hours <= 720) return 0.6;
  return 0.15;
}

export function leagueBoost(leagueName?: string): number {
  return europeanLeagueImportance(leagueName);
}

export function computeMarketPriorityScore(
  input: MarketPriorityInput,
  nowMs = Date.now(),
): number {
  if (input.isOrphan) return 0;
  if (input.isLive) {
    let liveScore = 50;
    liveScore *= leagueBoost(input.leagueName);
    return Math.round(liveScore * 100) / 100;
  }
  if (input.isTradable === false) return 0.01;

  let score = 10;
  score *= kickoffProximityBoost(input.kickoffMs, nowMs);
  score *= leagueBoost(input.leagueName);

  const vol = input.volume24h ?? 0;
  if (vol > 0) score += Math.min(8, Math.log10(vol + 1) * 2);

  const oi = input.openInterestUsd ?? 0;
  if (oi > 0) score += Math.min(6, oi / 200);

  const fills = input.recentFillCount24h ?? 0;
  score += Math.min(4, fills * 0.5);

  const traders = input.traderCount ?? 0;
  score += Math.min(3, traders * 0.15);

  score += disagreementBoost(input.primaryOutcomePrice);

  const util = input.utilizationPct ?? 0;
  if (util > 0.05 && util < 0.9) score += 1.5;

  const spread = input.spreadPct ?? 2;
  if (spread <= 3) score += 0.5;

  if (input.healthGrade === "A") score += 3;
  else if (input.healthGrade === "B") score += 1.5;
  else if (input.healthGrade === "D" || input.healthGrade === "F") score *= 0.2;

  if (input.oracleState === "pending") score *= 0.5;
  if (input.oracleState === "terminal") score *= 0.1;

  const hours = (input.kickoffMs - nowMs) / 3_600_000;
  if (hours > 720) score *= 0.25;

  return Math.round(score * 100) / 100;
}

export function sortByMarketPriority<T extends MarketPriorityInput>(
  items: T[],
  nowMs = Date.now(),
): T[] {
  return [...items].sort(
    (a, b) =>
      computeMarketPriorityScore(b, nowMs) - computeMarketPriorityScore(a, nowMs),
  );
}
