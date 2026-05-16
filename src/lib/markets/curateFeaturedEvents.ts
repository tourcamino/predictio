/**
 * Runtime “featured” curation for football-first premium positioning.
 * No DB schema — scores and re-orders Azuro-shaped markets (and any isomorphic row).
 */
import type { AzuroMarket } from "~/services/azuro";
import { safeString } from "~/lib/marketViewSafety";

/** Max featured cards (homepage / discover / caps). */
export const CURATED_FEATURED_MAX = 9;

/** Kickoff must be within this window (ms) from `now` for hard eligibility. */
export const FEATURED_MAX_HORIZON_MS = 15 * 24 * 60 * 60 * 1000;

/** Fallback window when strict pool yields fewer than target featured slots. */
export const FEATURED_MAX_HORIZON_RELAXED_MS = 21 * 24 * 60 * 60 * 1000;

/** Substrings on `competition` / `league` (case-insensitive). Keep tight — expand later for multi-sport. */
export const SUPPORTED_LEAGUES: readonly string[] = [
  "serie a",
  "champions league",
  "uefa champions",
  "europa league",
  "conference league",
  "premier league",
  "la liga",
  "laliga",
  "bundesliga",
  "eredivisie",
  "ligue 1",
  "primeira liga",
];

/** Extra boost when league string matches (multiplier applied on top of base league score). */
export const LEAGUE_PRESTIGE_EXTRA: ReadonlyArray<{ match: RegExp; boost: number }> = [
  { match: /champions league|uefa champions/i, boost: 22 },
  { match: /\bserie a\b/i, boost: 14 },
  { match: /premier league/i, boost: 14 },
  { match: /europa league/i, boost: 10 },
  { match: /la liga|laliga/i, boost: 10 },
  { match: /bundesliga/i, boost: 10 },
  { match: /ligue 1/i, boost: 8 },
  { match: /eredivisie/i, boost: 7 },
  { match: /primeira liga/i, boost: 7 },
];

/**
 * Brand tokens (lowercase). Value = rough prestige weight; unknown teams contribute 0 here.
 * Matching is substring on normalized team names.
 */
export const TEAM_BRAND_SCORES: Readonly<Record<string, number>> = {
  inter: 18,
  milan: 18,
  "ac milan": 18,
  juventus: 18,
  napoli: 15,
  roma: 14,
  lazio: 10,
  atalanta: 12,
  fiorentina: 8,
  arsenal: 17,
  chelsea: 16,
  liverpool: 20,
  "manchester city": 22,
  "manchester united": 16,
  tottenham: 12,
  "real madrid": 22,
  barcelona: 20,
  "fc barcelona": 20,
  "atletico madrid": 14,
  bayern: 20,
  dortmund: 12,
  psg: 18,
  "paris saint": 16,
  benfica: 10,
  porto: 10,
  ajax: 9,
  sevilla: 8,
  valencia: 7,
};

export type CurationCandidate = {
  id: string;
  sport: string;
  leagueLabel: string;
  teamNames: string[];
  startsAtMs: number;
  closesAtMs: number;
  yesImplied: number;
  noImplied: number;
  volume24h: number;
  liquidity: number;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Secondary European leagues — only used in relaxed curation tier. */
export function isTier2FootballLeague(leagueOrCompetition: string): boolean {
  const h = norm(leagueOrCompetition);
  if (h.includes("serie b") || h.includes("ligue 2") || h.includes("segunda")) return false;
  const t2 = [
    "eredivisie",
    "ligue 1",
    "primeira liga",
    "scottish premiership",
    "pro league",
    "super lig",
    "austrian bundesliga",
    "uefa conference",
    "conference league",
  ];
  return t2.some((frag) => h.includes(frag));
}

/** Hard gate: premium football league only. */
export function isSupportedPremiumLeague(leagueOrCompetition: string): boolean {
  const h = norm(leagueOrCompetition);
  if (h.includes("serie b") || h.includes("segunda")) return false;
  return SUPPORTED_LEAGUES.some((frag) => h.includes(frag));
}

function isFootballSport(sport: string): boolean {
  const s = norm(sport);
  return s.includes("football") || s.includes("soccer");
}

function teamBrandFromNames(teams: string[]): number {
  let sum = 0;
  for (const t of teams) {
    const n = norm(t);
    for (const [token, w] of Object.entries(TEAM_BRAND_SCORES)) {
      if (n.includes(token)) sum += w;
    }
  }
  return Math.min(sum, 55);
}

/** Strong preference for two-way markets near 50/50 implied (penalize 0.88 / 0.12 style lines). */
export function matchBalanceScore(yesImplied: number, noImplied: number): number {
  const y = Math.max(0.001, Math.min(0.999, yesImplied));
  const n = Math.max(0.001, Math.min(0.999, noImplied));
  const diff = Math.abs(y - n);
  // diff 0 → 55 pts; diff 0.76 → ~0
  return Math.max(0, 55 * (1 - Math.pow(diff / 0.85, 1.35)));
}

function leaguePrestigeScore(leagueLabel: string): number {
  let s = 12;
  const h = leagueLabel;
  for (const { match, boost } of LEAGUE_PRESTIGE_EXTRA) {
    if (match.test(h)) s += boost;
  }
  return s;
}

function freshnessScore(startsAtMs: number, nowMs: number): number {
  const days = (startsAtMs - nowMs) / (86400000);
  if (days < 0) return -80;
  if (days <= 2) return 18;
  if (days <= 7) return 28;
  if (days <= 14) return 14;
  return 6;
}

function activitySoftScore(volume: number, liquidity: number): number {
  const v = Math.log10(1 + Math.max(0, volume));
  const l = Math.log10(1 + Math.max(0, liquidity));
  return Math.min(18, (v + l) * 3.2);
}

/**
 * Returns null if the market fails hard filters (wrong sport/league/window).
 * Otherwise a comparable score (higher = better featured fit).
 */
export type CurationStrictness = "strict" | "relax1" | "relax2";

export function scoreCurationCandidate(
  c: CurationCandidate,
  nowMs: number,
  strictness: CurationStrictness = "strict",
): number | null {
  if (!isFootballSport(c.sport)) return null;

  const maxHorizon =
    strictness === "strict" ? FEATURED_MAX_HORIZON_MS : FEATURED_MAX_HORIZON_RELAXED_MS;
  const leagueOk =
    strictness === "relax2"
      ? isSupportedPremiumLeague(c.leagueLabel) || isTier2FootballLeague(c.leagueLabel)
      : isSupportedPremiumLeague(c.leagueLabel);
  if (!leagueOk) return null;

  if (c.startsAtMs < nowMs - 60_000) return null;
  if (c.startsAtMs > nowMs + maxHorizon) return null;
  if (c.closesAtMs <= nowMs + 120_000) return null;

  const brand = teamBrandFromNames(c.teamNames);
  const balance = matchBalanceScore(c.yesImplied, c.noImplied);
  const prestige = leaguePrestigeScore(c.leagueLabel);
  const fresh = freshnessScore(c.startsAtMs, nowMs);
  const act = activitySoftScore(c.volume24h, c.liquidity);

  // Penalize extremely lopsided lines even after balance term (safety net).
  const minSide = Math.min(c.yesImplied, c.noImplied);
  const skewPenalty = minSide < 0.14 ? -55 : minSide < 0.22 ? -28 : 0;

  return brand + balance + prestige + fresh + act + skewPenalty;
}

function extractTeams(m: AzuroMarket): string[] {
  if (m.event?.teams?.length) return m.event.teams;
  const vs = m.event?.name?.split(/\s+vs\.?\s+/i) ?? [];
  if (vs.length >= 2) return [vs[0]!.trim(), vs[1]!.trim()];
  return [];
}

function kickoffMs(m: AzuroMarket): number {
  const s = m.event?.startsAt;
  if (s) {
    const t = Date.parse(s);
    if (Number.isFinite(t)) return t;
  }
  const e = Date.parse(m.endsAt);
  return Number.isFinite(e) ? e : Date.now();
}

function closesMs(m: AzuroMarket): number {
  const e = Date.parse(m.endsAt);
  return Number.isFinite(e) ? e : kickoffMs(m) + 7200_000;
}

/** Map Azuro/seed market into scoring input (client-safe). */
export function azuroMarketToCandidate(m: AzuroMarket): CurationCandidate {
  const teams = extractTeams(m);
  const oc = m.outcomes ?? [];
  let yes = 0.5;
  let no = 0.5;
  if (oc.length >= 3) {
    let h = Number(oc[0]?.price ?? 0.33);
    let d = Number(oc[1]?.price ?? 0.34);
    let a = Number(oc[2]?.price ?? 0.33);
    if (h > 1 || d > 1 || a > 1) {
      h /= 100;
      d /= 100;
      a /= 100;
    }
    const sum3 = h + d + a;
    if (sum3 > 0 && Math.abs(sum3 - 1) > 0.02) {
      h /= sum3;
      d /= sum3;
      a /= sum3;
    }
    yes = h;
    no = a;
  } else if (oc.length >= 2) {
    yes = Number(oc[0]?.price ?? 0.5);
    no = Number(oc[1]?.price ?? 0.5);
    if (yes > 1 || no > 1) {
      yes /= 100;
      no /= 100;
    }
    const sum = yes + no;
    if (sum > 0 && Math.abs(sum - 1) > 0.02) {
      yes /= sum;
      no /= sum;
    }
  }
  yes = Math.max(0.02, Math.min(0.98, yes));
  no = Math.max(0.02, Math.min(0.98, no));

  return {
    id: m.id,
    sport: m.sport,
    leagueLabel: safeString(m.competition, "unknown"),
    teamNames: teams,
    startsAtMs: kickoffMs(m),
    closesAtMs: closesMs(m),
    yesImplied: yes,
    noImplied: no,
    volume24h: m.volume24h ?? 0,
    liquidity: m.liquidity ?? 0,
  };
}

export type ScoredMarket = { market: AzuroMarket; score: number; candidate: CurationCandidate };

function mergeScoredByBestScore(a: ScoredMarket[], b: ScoredMarket[]): ScoredMarket[] {
  const m = new Map<string, ScoredMarket>();
  for (const x of a) m.set(x.market.id, x);
  for (const x of b) {
    const cur = m.get(x.market.id);
    if (!cur || x.score > cur.score) m.set(x.market.id, x);
  }
  return [...m.values()].sort((x, y) => y.score - x.score);
}

/** Score + filter nulls. */
export function scoreAzuroMarkets(
  markets: AzuroMarket[],
  nowMs = Date.now(),
  strictness: CurationStrictness = "strict",
): ScoredMarket[] {
  const out: ScoredMarket[] = [];
  for (const market of markets) {
    const candidate = azuroMarketToCandidate(market);
    const s = scoreCurationCandidate(candidate, nowMs, strictness);
    if (s == null) continue;
    out.push({ market, score: s, candidate });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/**
 * Greedy diversity: cap per league and per kickoff day, then fill remaining slots by pure score.
 */
export function pickDiverseFeatured(
  scored: ScoredMarket[],
  limit: number,
): AzuroMarket[] {
  const leagueCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();
  const picked: AzuroMarket[] = [];
  const used = new Set<string>();

  const leagueKey = (m: AzuroMarket) => norm(m.competitionSlug || m.competition);
  const dayKey = (ms: number) => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
  };

  const tryAdd = (row: ScoredMarket, relax: boolean) => {
    if (used.has(row.market.id)) return false;
    if (!relax) {
      const L = leagueKey(row.market);
      const D = dayKey(row.candidate.startsAtMs);
      if ((leagueCounts.get(L) ?? 0) >= 2) return false;
      if ((dayCounts.get(D) ?? 0) >= 3) return false;
    }
    picked.push(row.market);
    used.add(row.market.id);
    if (!relax) {
      const L = leagueKey(row.market);
      const D = dayKey(row.candidate.startsAtMs);
      leagueCounts.set(L, (leagueCounts.get(L) ?? 0) + 1);
      dayCounts.set(D, (dayCounts.get(D) ?? 0) + 1);
    }
    return true;
  };

  for (const row of scored) {
    if (picked.length >= limit) break;
    tryAdd(row, false);
  }
  for (const row of scored) {
    if (picked.length >= limit) break;
    tryAdd(row, true);
  }
  return picked;
}

/** Public: up to `limit` (default 9) featured markets — diverse, scored. */
export function curateFeaturedAzuroMarkets(
  markets: AzuroMarket[],
  opts?: { limit?: number; now?: number },
): AzuroMarket[] {
  const limit = Math.min(opts?.limit ?? CURATED_FEATURED_MAX, CURATED_FEATURED_MAX);
  const now = opts?.now ?? Date.now();

  const strict = scoreAzuroMarkets(markets, now, "strict");
  let picked = pickDiverseFeatured(strict, limit);
  if (picked.length >= limit) return picked;

  const merged1 = mergeScoredByBestScore(strict, scoreAzuroMarkets(markets, now, "relax1"));
  picked = pickDiverseFeatured(merged1, limit);
  if (picked.length >= limit) return picked;

  const merged2 = mergeScoredByBestScore(
    merged1,
    scoreAzuroMarkets(markets, now, "relax2"),
  );
  return pickDiverseFeatured(merged2, limit);
}

/** Re-order full list: curated featured first (same diversity cap), then remainder in original order. */
export function prioritizeFeaturedAzuroMarkets(
  markets: AzuroMarket[],
  opts?: { featuredLimit?: number; now?: number },
): AzuroMarket[] {
  const featured = curateFeaturedAzuroMarkets(markets, {
    limit: opts?.featuredLimit ?? CURATED_FEATURED_MAX,
    now: opts?.now,
  });
  const ids = new Set(featured.map((m) => m.id));
  const tail = markets.filter((m) => !ids.has(m.id));
  return [...featured, ...tail];
}

/** Full list sorted by curation score (nulls last) — for autonomous bots scanning a wide pool. */
export function rankAzuroMarketsByCurationScore(
  markets: AzuroMarket[],
  nowMs = Date.now(),
): AzuroMarket[] {
  const withScores = markets.map((m) => {
    const c = azuroMarketToCandidate(m);
    return { m, s: scoreCurationCandidate(c, nowMs, "strict") };
  });
  withScores.sort((a, b) => {
    if (a.s == null && b.s == null) return 0;
    if (a.s == null) return 1;
    if (b.s == null) return -1;
    return b.s - a.s;
  });
  return withScores.map((x) => x.m);
}
