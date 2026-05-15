import type { AzuroMarket } from "~/services/azuro";

/**
 * Homepage featured intelligence — ranks candidates for cover-story placement.
 * Uses editorial slot, competition lane, anticipation window, and importanceScore
 * (proxy for backend premium / appeal). Does NOT weight raw liquidity or pure imminence.
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
      comp.includes("french open"))
  ) {
    lane = Math.max(lane, 46);
  }
  if (/\b(sinner|alcaraz|djokovic|nadal)\b/i.test(blob)) {
    lane = Math.max(lane, 42);
  }
  if (sport === "motorsport" || sport === "f1" || comp.includes("formula 1") || comp.includes("grand prix")) {
    lane = Math.max(lane, 44);
  }
  if (comp.includes("serie a") || comp.includes("coppa italia") || comp.includes("supercoppa")) {
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

/** Re-rank API slice and cap visible density on the intelligence homepage. */
export function orderForHomepageIntelligence(
  markets: AzuroMarket[],
  nowMs: number,
  maxVisible = 5,
): AzuroMarket[] {
  if (markets.length === 0) return [];
  const ranked = [...markets].sort((a, b) => {
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

/** One-line editorial framing for the briefing kicker (no odds language). */
export function editorialBriefingDescriptor(m: AzuroMarket): string {
  const comp = m.competition;
  if (/champions league/i.test(comp) && !/afc|caf/i.test(comp)) return "European cup · editorial anchor";
  if (/grand slam|wimbledon|roland|australian open|us open/i.test(comp)) return "Major draw · court signal";
  if (/\bformula\s*1\b|grand prix/i.test(comp) || m.sport === "f1" || m.sport === "motorsport") {
    return "Race weekend · grid outlook";
  }
  if (/serie a|coppa italia/i.test(comp)) return "Italian lane · night focus";
  if (m.editorialSlot === "tennisPremium") return "Court · premium lane";
  if (m.editorialSlot === "basketballPremium") return "Hardwood · premium lane";
  if (m.editorialSlot === "motorsportCombat") return "Motorsport · premium lane";
  if (m.editorialSlot === "italyFirst") return "Italy-first · protocol signal";
  if (m.editorialSlot === "premiumAnchors") return "Premium anchor · consensus window";
  return "Curated outlook";
}
