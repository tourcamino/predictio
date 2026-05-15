import type { AzuroMarket } from "~/services/azuro";
import {
  azuroMarketPassesStrictPremium,
  isVerifiedItalianFootballCopy,
  premiumCatalogTier,
  premiumTierSortKey,
} from "~/lib/premiumCatalogStrictClient";

/**
 * Homepage featured intelligence — ranks candidates for cover-story placement.
 * Uses competition lane, anticipation window, and importanceScore.
 * Copy and hero eligibility are validated against real league/geo/entities (P5 firewall).
 */

function kickoffMs(m: AzuroMarket): number {
  const t = Date.parse(m.event?.startsAt ?? "");
  return Number.isFinite(t) ? t : NaN;
}

function eventTextBlob(m: AzuroMarket): string {
  const q = (m.question ?? "").toLowerCase();
  const ev = (m.event?.name ?? "").toLowerCase();
  const teams = (m.event?.teams ?? []).join(" ").toLowerCase();
  return `${q} ${ev} ${teams}`;
}

/** Cover-story hero only when strict premium validates — avoids hype on filler rows. */
export function marketQualifiesForFeaturedHero(m: AzuroMarket): boolean {
  return azuroMarketPassesStrictPremium(m);
}

/** Single priority score — higher wins featured. */
export function featuredPriorityScore(m: AzuroMarket, nowMs: number): number {
  let s = 0;
  const comp = m.competition.toLowerCase();
  const sport = m.sport.toLowerCase();
  const blob = eventTextBlob(m);

  const slot = m.editorialSlot;
  if (slot === "premiumAnchors") s += 52;
  else if (slot === "tennisPremium") s += 44;
  else if (slot === "motorsportCombat") s += 44;
  else if (slot === "italyFirst") s += 40;
  else if (slot === "basketballPremium") s += 36;
  else if (slot === "unionBerlin") s += 26;
  else s += 10;

  let lane = 0;
  if (comp.includes("champions league") && !comp.includes("afc") && !comp.includes("caf")) {
    lane = Math.max(lane, 50);
  }
  if (
    sport === "tennis" &&
    (comp.includes("grand slam") ||
      comp.includes("wimbledon") ||
      comp.includes("roland") ||
      comp.includes("australian open") ||
      comp.includes("us open") ||
      comp.includes("french open") ||
      /\batp|masters/.test(comp))
  ) {
    lane = Math.max(lane, 46);
  }
  if (/\b(sinner|alcaraz|djokovic|nadal)\b/i.test(blob)) {
    lane = Math.max(lane, 42);
  }
  if (
    sport === "motorsport" ||
    sport === "f1" ||
    comp.includes("formula 1") ||
    comp.includes("grand prix")
  ) {
    lane = Math.max(lane, 44);
  }
  if (isVerifiedItalianFootballCopy(m)) {
    lane = Math.max(lane, 34);
  }
  if (
    sport === "basketball" &&
    (comp.includes("playoff") ||
      comp.includes("finals") ||
      comp.includes("conference final") ||
      blob.includes("playoff"))
  ) {
    lane = Math.max(lane, 36);
  }
  if (comp.includes("euroleague") && (comp.includes("final") || blob.includes("final four"))) {
    lane = Math.max(lane, 32);
  }
  s += lane;

  const imp = m.importanceScore ?? 0;
  s += Math.min(26, imp * 0.11);

  const k = kickoffMs(m);
  if (Number.isFinite(k)) {
    const h = (k - nowMs) / 3_600_000;
    if (h < 0) s -= 20;
    else if (h < 6) s -= 14;
    else if (h < 36) s += 2;
    else if (h <= 240) s += 26;
    else if (h <= 720) s += 18;
    else s += 8;
  }

  return s;
}

/** Re-rank API slice and cap visible rows on the homepage (default: full nine-slot book). */
export function orderForHomepageIntelligence(
  markets: AzuroMarket[],
  nowMs: number,
  maxVisible = 9,
): AzuroMarket[] {
  if (markets.length === 0) return [];
  const ranked = [...markets].sort((a, b) => {
    const tt = premiumTierSortKey(premiumCatalogTier(b)) - premiumTierSortKey(premiumCatalogTier(a));
    if (tt !== 0) return tt;
    const d = featuredPriorityScore(b, nowMs) - featuredPriorityScore(a, nowMs);
    if (d !== 0) return d;
    const ia = a.importanceScore ?? 0;
    const ib = b.importanceScore ?? 0;
    if (ib !== ia) return ib - ia;
    const ka = kickoffMs(a);
    const kb = kickoffMs(b);
    if (Number.isFinite(ka) && Number.isFinite(kb)) return ka - kb;
    return 0;
  });
  return ranked.slice(0, maxVisible);
}

/**
 * One-line editorial framing derived from verified content only — never from stale slots alone.
 */
export function editorialBriefingDescriptor(m: AzuroMarket): string {
  const comp = m.competition;
  const compL = comp.toLowerCase();
  const blob = eventTextBlob(m);
  const sport = m.sport.toLowerCase();

  if (/champions league/i.test(comp) && !/afc|caf/i.test(comp)) {
    return "European cup · editorial anchor";
  }

  if (isVerifiedItalianFootballCopy(m)) {
    return "Italian football · night focus";
  }

  if (
    sport === "tennis" &&
    (compL.includes("grand slam") ||
      /wimbledon|roland|australian open|us open|french open/i.test(compL) ||
      (/\batp|masters/.test(compL) && /\b(sinner|alcaraz|djokovic|nadal)\b/i.test(blob)))
  ) {
    return "Court · premium lane";
  }

  if (
    sport === "basketball" &&
    (compL.includes("playoff") ||
      compL.includes("finals") ||
      compL.includes("conference") ||
      blob.includes("playoff"))
  ) {
    return "Hardwood · playoff window";
  }

  if (
    sport === "f1" ||
    sport === "motorsport" ||
    /\bformula\s*1\b|grand prix/i.test(compL)
  ) {
    return "Race weekend · grid outlook";
  }

  if (sport === "mma" && /\bufc\b/i.test(compL)) {
    return "Combat sport · numbered card";
  }

  if (
    compL.includes("premier league") &&
    !compL.includes("scottish") &&
    !compL.includes("northern ireland")
  ) {
    return "Premier League · anchor window";
  }
  if (compL.includes("la liga") || compL.includes("laliga")) {
    return "La Liga · anchor window";
  }
  if (compL.includes("bundesliga")) {
    return "Bundesliga · anchor window";
  }
  if (compL.includes("ligue 1")) {
    return "Ligue 1 · anchor window";
  }

  return "Curated outlook";
}
