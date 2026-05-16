/**
 * Interest-first catalog — global recognizability / engagement ranking.
 * Low-interest events receive lower scores but are never hard-rejected by this module.
 */

import type { RawAzuroGame } from "./azuroCuratorGraphql";
import { extract1x2DecimalOddsFromRawGame } from "./azuroCuratorGraphql";
import { canonicalSportFromRaw, type CanonicalSport } from "./canonicalSportTaxonomy";
import { classifyLeagueTier } from "./editorialLeagueTiers";

/** Default ON — set `PREDICTIO_LEGACY_INTEREST_FIRST_OFF=true` to restore appeal-threshold gating. */
export function isInterestFirstCatalogMode(): boolean {
  return String(process.env.PREDICTIO_LEGACY_INTEREST_FIRST_OFF ?? "").trim().toLowerCase() !== "true";
}

/** Restore Tier A/B/C football pool + Europe editorial tiers as hard funnel caps. */
export function isLegacyEuropeanTierHardGate(): boolean {
  return String(process.env.PREDICTIO_LEGACY_TIER_HARD_GATE ?? "").trim().toLowerCase() === "true";
}

function participantBlob(g: RawAzuroGame): string {
  const parts = Array.isArray(g.participants) ? [...g.participants] : [];
  parts.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const h = String(parts[0]?.name || "").trim();
  const a = String(parts[1]?.name || "").trim();
  return `${h} ${a}`.toLowerCase();
}

function textBlob(g: RawAzuroGame): string {
  const league = (g.league?.name || "").toLowerCase();
  const country = (g.league?.country?.name || "").toLowerCase();
  const title = (g.title || "").toLowerCase();
  return `${league} ${country} ${title} ${participantBlob(g)}`;
}

/** Pattern packs — additive; capped to avoid double-counting explosions. */
const HIGH_GLOBAL_PATTERNS: RegExp[] = [
  /real\s+madrid|\barcelona\b|atletico\s+madrid|psg|paris\s+sg|bayern|borussia|manchester\s+(city|united)|\bliverpool\b|\barsenal\b|\bchelsea\b|\btottenham\b|\bnewcastle\b/,
  /\bjuventus\b|\bssc\s+napoli\b|\bnapoli\b|\binter\b|\bac\s+milan\b|\broma\b|\blazio\b|\batalanta\b/,
  /champions\s+league|europa\s+league|conference\s+league/,
  /premier\s+league|serie\s+a|la\s+liga|laliga|bundesliga|ligue\s+1|copa\s+del\s+rey|coppa\s+italia|fa\s+cup|dfb[\s-]*pokal/,
  /\bsinner\b|\balcaraz\b|\bdjokovic\b|\bnadal\b|\bfederer\b|\bmedvedev\b|\brune\b|\bzverev\b/,
  /wimbledon|roland\s+garros|australian\s+open|us\s+open|atp\s+finals|indian\s+wells|miami\s+open|monte\s+carlo|rome\s+masters|madrid\s+masters|shanghai|paris\s+masters|\bmasters\s+1000\b/,
  /\bufc\b|title\s+fight|main\s+event|ppv|\btyson\b/,
  /formula\s*1|\bf1\b|\bgrand\s+prix\b|verstappen|hamilton|leclerc|ferrari|\bred\s+bull\b|motogp|\bmoto\s*gp\b/,
  /\bnba\b|playoffs|conference\s+finals|\b-finals\b|lakers|celtics|warriors|bucks|nuggets/,
  /super\s+bowl|\bnfl\b/,
];

const SPORT_BASE: Record<CanonicalSport, number> = {
  football: 14,
  tennis: 10,
  basketball: 12,
  motorsport: 12,
  mma: 12,
  hockey: 10,
};

/**
 * Single scalar — higher = more globally interesting / recognizable.
 * Tuned to float marquee events (UCL, NBA, UFC, F1, ATP) while keeping minor leagues in the low end.
 */
export function computeGlobalInterestScore(g: RawAzuroGame): number {
  const sport = canonicalSportFromRaw(g);
  const leagueName = g.league?.name ?? "";
  const country = g.league?.country?.name ?? "";
  const slug = g.league?.slug;
  const blob = textBlob(g);

  let score = sport != null ? SPORT_BASE[sport] : 6;

  const verdict = classifyLeagueTier(leagueName, country, slug);
  if (verdict.tier === "A") score += 52;
  else if (verdict.tier === "B") score += 34;
  else if (verdict.tier === "C") score += 18;
  else score += 8;

  let patternHits = 0;
  for (const re of HIGH_GLOBAL_PATTERNS) {
    if (re.test(blob)) patternHits += 1;
  }
  score += Math.min(72, patternHits * 18);

  const odds = extract1x2DecimalOddsFromRawGame(g);
  if (odds.homeOdds != null && odds.awayOdds != null) {
    const gap = Math.abs(odds.homeOdds - odds.awayOdds);
    if (gap < 3.2) score += 10;
    if (odds.drawOdds != null) score += 3;
  }

  const ac = Number(g.activeConditionsCount ?? 0);
  score += Math.min(22, ac * 3);

  const parts = Array.isArray(g.participants) ? g.participants.length : 0;
  if (parts < 2) score -= 40;

  score += Math.min(40, (g.title || "").length / 8);

  return Math.max(4, Math.min(420, Math.round(score)));
}
