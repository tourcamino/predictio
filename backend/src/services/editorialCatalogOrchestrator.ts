import type { RawAzuroGame } from "./azuroCuratorGraphql";
import { canonicalSportFromRaw } from "./canonicalSportTaxonomy";
import {
  classifyLeagueTier,
  isItalianSerieA,
  isItalianSerieBFixture,
  normCountry,
} from "./editorialLeagueTiers";
import { MULTISPORT_SLOT_PREFER_MIN } from "./premiumSportScoring";
export type ScoredItalian = { raw: RawAzuroGame; importanceScore: number };

const ITALIAN_PRESTIGE_CLUB_SNIPPETS = [
  "juventus",
  "inter",
  "milan",
  "roma",
  "lazio",
  "napoli",
  "fiorentina",
  "atalanta",
  "bologna",
] as const;

const UNION_BERLIN_SNIPPETS = ["union berlin", "1. fc union berlin", "fc union berlin"] as const;

function teamNamesFromRaw(g: RawAzuroGame): { home: string; away: string } {
  const parts = g.participants;
  const arr = Array.isArray(parts) ? [...parts] : [];
  arr.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  return {
    home: String(arr[0]?.name || "").toLowerCase(),
    away: String(arr[1]?.name || "").toLowerCase(),
  };
}

function normTeamBlob(home: string, away: string): string {
  return ` ${home} ${away} `;
}

function italianPrestigeClubInFixture(raw: RawAzuroGame): boolean {
  const { home, away } = teamNamesFromRaw(raw);
  const blob = normTeamBlob(home, away);
  return ITALIAN_PRESTIGE_CLUB_SNIPPETS.some((club) => blob.includes(club));
}

export function isItalianPriorityFixture(raw: RawAzuroGame): boolean {
  const leagueName = String(raw.league?.name || "");
  const country = String(raw.league?.country?.name || "");
  const slug = raw.league?.slug;
  const cnt = normCountry(country);
  if (cnt !== "italy") return false;
  if (leagueName.toLowerCase().includes("coppa italia")) return true;
  if (isItalianSerieA(leagueName, country, slug)) return true;
  if (isItalianSerieBFixture(leagueName, country, slug)) return true;
  if (italianPrestigeClubInFixture(raw)) return true;
  if (leagueName.toLowerCase().includes("supercoppa")) return true;
  return false;
}

export function isUnionBerlinFixture(raw: RawAzuroGame): boolean {
  const { home, away } = teamNamesFromRaw(raw);
  const blob = `${home} ${away}`;
  return UNION_BERLIN_SNIPPETS.some((s) => blob.includes(s));
}

function getTemporalBandForUnix(nowSec: number, kickoffSec: number): "SOON" | "MID" | "LATER" {
  const d = kickoffSec - nowSec;
  const soon = 3 * 24 * 60 * 60;
  const mid = 14 * 24 * 60 * 60;
  if (d <= soon) return "SOON";
  if (d <= mid) return "MID";
  return "LATER";
}

export type EditorialSlotId =
  | "premiumAnchors"
  | "italyFirst"
  | "unionBerlin"
  | "tennisPremium"
  | "basketballPremium"
  | "motorsportCombat"
  | "adaptiveFallback";

export const CATALOG_TARGET_SIZE = 9;

/** Named slot budgets (adaptive fills remainder to `CATALOG_TARGET_SIZE`). */
export const EDITORIAL_SLOT_TARGETS: Readonly<Record<Exclude<EditorialSlotId, "adaptiveFallback">, number>> =
  {
    premiumAnchors: 3,
    italyFirst: 2,
    unionBerlin: 1,
    tennisPremium: 1,
    basketballPremium: 1,
    motorsportCombat: 1,
  };

export type EditorialPickMeta = {
  slot: EditorialSlotId;
  selectionReason: string;
};

export type EditorialOrchestrationDiagnostics = {
  editorialSlots: Record<EditorialSlotId, number>;
  slotTargets: typeof EDITORIAL_SLOT_TARGETS & { adaptiveFallback: number };
  redistributions: string[];
  samples: Array<{
    fixture: string;
    slot: EditorialSlotId;
    selectionReason: string;
    appealScore: number;
  }>;
};

export type EditorialOrchestrationResult = {
  picked: ScoredItalian[];
  metaByGameId: Map<string, EditorialPickMeta>;
  diagnostics: EditorialOrchestrationDiagnostics;
};

const FOOTBALL_SLOT_FILL_ORDER: Array<
  Exclude<EditorialSlotId, "adaptiveFallback" | "tennisPremium" | "basketballPremium" | "motorsportCombat">
> = ["premiumAnchors", "unionBerlin", "italyFirst"];

const MULTISPORT_SLOT_FILL_ORDER: Array<
  "tennisPremium" | "basketballPremium" | "motorsportCombat"
> = ["tennisPremium", "basketballPremium", "motorsportCombat"];

const SLOT_DISPLAY_PRIORITY: Record<EditorialSlotId, number> = {
  premiumAnchors: 0,
  unionBerlin: 1,
  italyFirst: 2,
  tennisPremium: 3,
  basketballPremium: 4,
  motorsportCombat: 5,
  adaptiveFallback: 6,
};

function isFootballCandidate(it: ScoredItalian): boolean {
  return canonicalSportFromRaw(it.raw) === "football";
}

const VEIKKAUSLIIGA_PENALTY = 45;

function scoredGameId(it: ScoredItalian): string {
  return String(it.raw.gameId || "").trim();
}

function fixtureTitle(it: ScoredItalian): string {
  const parts = it.raw.participants;
  const arr = Array.isArray(parts) ? [...parts] : [];
  arr.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const home = String(arr[0]?.name || "Home").trim();
  const away = String(arr[1]?.name || "Away").trim();
  return `${home} vs ${away}`;
}

function byAppealThenKickoff(a: ScoredItalian, b: ScoredItalian): number {
  if (b.importanceScore !== a.importanceScore) {
    return b.importanceScore - a.importanceScore;
  }
  return parseInt(String(a.raw.startsAt), 10) - parseInt(String(b.raw.startsAt), 10);
}

function isUclLeague(leagueName: string): boolean {
  const ln = leagueName.toLowerCase();
  return ln.includes("champions league") && !ln.includes("afc") && !ln.includes("caf");
}

function isEnglishPremierLeague(leagueName: string, country: string): boolean {
  const ln = leagueName.toLowerCase();
  const cnt = normCountry(country);
  return (
    cnt === "england" &&
    ln.includes("premier league") &&
    !ln.includes("scottish") &&
    !ln.includes("northern ireland")
  );
}

function isTopEuropeanLeague(leagueName: string, country: string, slug?: string): boolean {
  if (isUclLeague(leagueName)) return true;
  if (isEnglishPremierLeague(leagueName, country)) return true;
  if (isItalianSerieA(leagueName, country, slug)) return true;
  const cnt = normCountry(country);
  const ln = leagueName.toLowerCase();
  if (cnt === "spain" && (ln.includes("la liga") || ln.includes("laliga"))) return true;
  if (cnt === "germany" && ln.includes("bundesliga") && !ln.includes("austria")) return true;
  if (cnt === "france" && ln.includes("ligue 1")) return true;
  const uefaEl =
    ln.includes("europa league") && !ln.includes("conference");
  const uefaConf = ln.includes("conference league");
  return uefaEl || uefaConf;
}

function matchesTennisPremiumSlot(it: ScoredItalian): boolean {
  return (
    canonicalSportFromRaw(it.raw) === "tennis" &&
    it.importanceScore >= MULTISPORT_SLOT_PREFER_MIN
  );
}

function matchesBasketballPremiumSlot(it: ScoredItalian): boolean {
  return (
    canonicalSportFromRaw(it.raw) === "basketball" &&
    it.importanceScore >= MULTISPORT_SLOT_PREFER_MIN
  );
}

function matchesMotorsportCombatSlot(it: ScoredItalian): boolean {
  const sport = canonicalSportFromRaw(it.raw);
  return (
    (sport === "motorsport" || sport === "mma") &&
    it.importanceScore >= MULTISPORT_SLOT_PREFER_MIN
  );
}

/** Slot A — UCL, EPL, Serie A, other top-European premium fixtures. */
export function matchesPremiumAnchorSlot(it: ScoredItalian): boolean {
  if (!isFootballCandidate(it)) return false;
  const leagueName = it.raw.league?.name ?? "";
  const country = it.raw.league?.country?.name ?? "";
  const slug = it.raw.league?.slug;
  if (!isTopEuropeanLeague(leagueName, country, slug)) return false;
  const tier = classifyLeagueTier(leagueName, country, slug).tier;
  if (tier === "C") return false;
  if (isUclLeague(leagueName) || isEnglishPremierLeague(leagueName, country)) return true;
  if (isItalianSerieA(leagueName, country, slug)) return true;
  return it.importanceScore >= 95;
}

/** Slot B — Italy-first identity (Serie A/B, Coppa, prestige Italian clubs). */
export function matchesItalyFirstSlot(it: ScoredItalian): boolean {
  return isFootballCandidate(it) && isItalianPriorityFixture(it.raw);
}

/** Slot C — Union Berlin protocol anchor. */
export function matchesUnionBerlinSlot(it: ScoredItalian): boolean {
  return isFootballCandidate(it) && isUnionBerlinFixture(it.raw);
}

function isVeikkausliiga(it: ScoredItalian): boolean {
  const leagueName = (it.raw.league?.name ?? "").toLowerCase();
  const country = normCountry(it.raw.league?.country?.name ?? "");
  return country === "finland" && leagueName.includes("veikkausliiga");
}

function adaptiveScore(it: ScoredItalian, tierCActivated: boolean): number {
  const leagueName = it.raw.league?.name ?? "";
  const country = it.raw.league?.country?.name ?? "";
  const tier = classifyLeagueTier(leagueName, country, it.raw.league?.slug).tier;
  let score = it.importanceScore;
  if (tier === "C" && !tierCActivated) return -1;
  if (tier === "C") score -= 12;
  if (isVeikkausliiga(it)) score -= VEIKKAUSLIIGA_PENALTY;
  return score;
}

function slotMatcher(slot: Exclude<EditorialSlotId, "adaptiveFallback">): (it: ScoredItalian) => boolean {
  switch (slot) {
    case "premiumAnchors":
      return matchesPremiumAnchorSlot;
    case "italyFirst":
      return matchesItalyFirstSlot;
    case "unionBerlin":
      return matchesUnionBerlinSlot;
    case "tennisPremium":
      return matchesTennisPremiumSlot;
    case "basketballPremium":
      return matchesBasketballPremiumSlot;
    case "motorsportCombat":
      return matchesMotorsportCombatSlot;
  }
}

function selectionReasonFor(
  slot: EditorialSlotId,
  it: ScoredItalian,
): string {
  switch (slot) {
    case "premiumAnchors":
      return "editorial-anchor";
    case "italyFirst":
      return "italy-first-identity";
    case "unionBerlin":
      return "editorial-anchor";
    case "tennisPremium":
      return "tennis-premium";
    case "basketballPremium":
      return "basketball-premium";
    case "motorsportCombat":
      return "motorsport-combat-premium";
    case "adaptiveFallback":
      return "adaptive-fallback";
  }
}

function fillNamedSlot(
  slot: Exclude<EditorialSlotId, "adaptiveFallback">,
  target: number,
  pool: ScoredItalian[],
  used: Set<string>,
  picked: ScoredItalian[],
  metaByGameId: Map<string, EditorialPickMeta>,
): number {
  const matcher = slotMatcher(slot);
  const candidates = pool
    .filter((it) => {
      const gid = scoredGameId(it);
      return gid && !used.has(gid) && matcher(it);
    })
    .sort(byAppealThenKickoff);

  let filled = 0;
  for (const it of candidates) {
    if (filled >= target) break;
    const gid = scoredGameId(it);
    if (!gid || used.has(gid)) continue;
    used.add(gid);
    picked.push(it);
    metaByGameId.set(gid, {
      slot,
      selectionReason: selectionReasonFor(slot, it),
    });
    filled += 1;
  }
  return filled;
}

function fillAdaptiveFallback(
  pool: ScoredItalian[],
  used: Set<string>,
  picked: ScoredItalian[],
  metaByGameId: Map<string, EditorialPickMeta>,
  tierCActivated: boolean,
  nowSec: number,
): void {
  const remaining = CATALOG_TARGET_SIZE - picked.length;
  if (remaining <= 0) return;

  const candidates = pool
    .filter((it) => {
      const gid = scoredGameId(it);
      return gid && !used.has(gid);
    })
    .map((it) => ({
      it,
      score: adaptiveScore(it, tierCActivated),
      band: getTemporalBandForUnix(nowSec, parseInt(String(it.raw.startsAt), 10)),
    }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const bandPri = (band: string) => (band === "SOON" ? 3 : band === "MID" ? 2 : 1);
      const bp = bandPri(b.band) - bandPri(a.band);
      if (bp !== 0) return bp;
      return byAppealThenKickoff(a.it, b.it);
    });

  for (const { it } of candidates) {
    if (picked.length >= CATALOG_TARGET_SIZE) break;
    const gid = scoredGameId(it);
    if (!gid || used.has(gid)) continue;
    used.add(gid);
    picked.push(it);
    metaByGameId.set(gid, {
      slot: "adaptiveFallback",
      selectionReason: selectionReasonFor("adaptiveFallback", it),
    });
  }
}

function sortPickedEditorialOrder(
  picked: ScoredItalian[],
  metaByGameId: Map<string, EditorialPickMeta>,
): ScoredItalian[] {
  return [...picked].sort((a, b) => {
    const ma = metaByGameId.get(scoredGameId(a))!;
    const mb = metaByGameId.get(scoredGameId(b))!;
    const sp = SLOT_DISPLAY_PRIORITY[ma.slot] - SLOT_DISPLAY_PRIORITY[mb.slot];
    if (sp !== 0) return sp;
    return byAppealThenKickoff(a, b);
  });
}

export type OrchestrateEditorialCatalogOptions = {
  tierCActivated?: boolean;
  nowSec?: number;
  /** Premium-scored non-football pool (tennis / basketball / motorsport / MMA). */
  multisportPool?: ScoredItalian[];
};

/**
 * Editorial Identity Orchestration — slot guarantees with appeal ranking inside each slot.
 */
export function orchestrateEditorialCatalog(
  pool: ScoredItalian[],
  options?: OrchestrateEditorialCatalogOptions,
): EditorialOrchestrationResult {
  const tierCActivated = options?.tierCActivated ?? false;
  const nowSec = options?.nowSec ?? Math.floor(Date.now() / 1000);
  const used = new Set<string>();
  const picked: ScoredItalian[] = [];
  const metaByGameId = new Map<string, EditorialPickMeta>();
  const redistributions: string[] = [];

  const footballPool = pool.filter(isFootballCandidate);
  const multisportPool = options?.multisportPool ?? [];

  for (const slot of FOOTBALL_SLOT_FILL_ORDER) {
    const target = EDITORIAL_SLOT_TARGETS[slot];
    const filled = fillNamedSlot(slot, target, footballPool, used, picked, metaByGameId);
    if (filled < target) {
      redistributions.push(
        `${slot}: filled ${filled}/${target} — remainder flows to adaptive fallback`,
      );
    }
  }

  for (const slot of MULTISPORT_SLOT_FILL_ORDER) {
    const target = EDITORIAL_SLOT_TARGETS[slot];
    const filled = fillNamedSlot(slot, target, multisportPool, used, picked, metaByGameId);
    if (filled < target) {
      redistributions.push(
        `${slot}: filled ${filled}/${target} — no low-tier multisport backfill`,
      );
    }
  }

  fillAdaptiveFallback(footballPool, used, picked, metaByGameId, tierCActivated, nowSec);

  const ordered = sortPickedEditorialOrder(picked, metaByGameId).slice(0, CATALOG_TARGET_SIZE);

  const editorialSlots: Record<EditorialSlotId, number> = {
    premiumAnchors: 0,
    italyFirst: 0,
    unionBerlin: 0,
    tennisPremium: 0,
    basketballPremium: 0,
    motorsportCombat: 0,
    adaptiveFallback: 0,
  };
  for (const it of ordered) {
    const m = metaByGameId.get(scoredGameId(it));
    if (m) editorialSlots[m.slot] += 1;
  }

  const namedSlotSum = Object.values(EDITORIAL_SLOT_TARGETS).reduce((s, n) => s + n, 0);
  const adaptiveFallbackTarget = Math.max(0, CATALOG_TARGET_SIZE - namedSlotSum);

  const samples = ordered.slice(0, 8).map((it) => {
    const gid = scoredGameId(it);
    const m = metaByGameId.get(gid)!;
    return {
      fixture: fixtureTitle(it),
      slot: m.slot,
      selectionReason: m.selectionReason,
      appealScore: it.importanceScore,
    };
  });

  return {
    picked: ordered,
    metaByGameId,
    diagnostics: {
      editorialSlots,
      slotTargets: { ...EDITORIAL_SLOT_TARGETS, adaptiveFallback: adaptiveFallbackTarget },
      redistributions,
      samples,
    },
  };
}

/** Infer slot for persisted catalog rows (public API enrichment). */
export function inferEditorialSlotForFixture(input: {
  leagueName: string;
  country: string;
  homeTeam: string;
  awayTeam: string;
  importanceScore?: number;
  leagueSlug?: string;
  sport?: string;
  sportSlug?: string;
}): EditorialPickMeta {
  const raw = {
    gameId: "infer",
    startsAt: String(Math.floor(Date.now() / 1000)),
    sport: { name: input.sport, slug: input.sportSlug },
    league: {
      name: input.leagueName,
      country: { name: input.country },
      slug: input.leagueSlug,
    },
    participants: [
      { name: input.homeTeam, sortOrder: 0 },
      { name: input.awayTeam, sortOrder: 1 },
    ],
  } as RawAzuroGame;

  const it: ScoredItalian = {
    raw,
    importanceScore: input.importanceScore ?? 0,
  };

  if (matchesTennisPremiumSlot(it)) {
    return { slot: "tennisPremium", selectionReason: "tennis-premium" };
  }
  if (matchesBasketballPremiumSlot(it)) {
    return { slot: "basketballPremium", selectionReason: "basketball-premium" };
  }
  if (matchesMotorsportCombatSlot(it)) {
    return { slot: "motorsportCombat", selectionReason: "motorsport-combat-premium" };
  }
  if (matchesUnionBerlinSlot(it)) {
    return { slot: "unionBerlin", selectionReason: "editorial-anchor" };
  }
  if (matchesItalyFirstSlot(it)) {
    return { slot: "italyFirst", selectionReason: "italy-first-identity" };
  }
  if (matchesPremiumAnchorSlot(it)) {
    return { slot: "premiumAnchors", selectionReason: "editorial-anchor" };
  }
  return { slot: "adaptiveFallback", selectionReason: "adaptive-fallback" };
}

export function compareEditorialCatalogOrder(
  a: { editorialSlot?: EditorialSlotId; importanceScore?: number; startsAtMs?: number },
  b: { editorialSlot?: EditorialSlotId; importanceScore?: number; startsAtMs?: number },
): number {
  const pa = a.editorialSlot ? SLOT_DISPLAY_PRIORITY[a.editorialSlot] : 99;
  const pb = b.editorialSlot ? SLOT_DISPLAY_PRIORITY[b.editorialSlot] : 99;
  if (pa !== pb) return pa - pb;
  const scoreDiff = (b.importanceScore ?? 0) - (a.importanceScore ?? 0);
  if (scoreDiff !== 0) return scoreDiff;
  return (a.startsAtMs ?? 0) - (b.startsAtMs ?? 0);
}
