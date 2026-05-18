/**
 * Real-data market priority scoring for catalog ranking (PR16).
 * No fake trending — only kickoff, league, activity, oracle, liquidity signals.
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
};

const TOP_LEAGUE_RE =
  /premier league|champions league|uefa|serie a|la liga|laliga|bundesliga|ligue 1|eredivisie|europa league/i;

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
  if (!leagueName) return 1;
  return TOP_LEAGUE_RE.test(leagueName) ? 1.6 : 1;
}

export function computeMarketPriorityScore(
  input: MarketPriorityInput,
  nowMs = Date.now(),
): number {
  if (input.isOrphan) return 0;
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
