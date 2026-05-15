import type { RawAzuroGame } from "./azuroCuratorGraphql";
import {
  canonicalSportFromRaw,
  normalizeCompetitionTier,
  type CanonicalSport,
} from "./canonicalSportTaxonomy";

export const MULTISPORT_PREMIUM_POOL_MIN = 72;
export const MULTISPORT_SLOT_PREFER_MIN = 82;

export type PremiumScoreBreakdown = {
  canonicalSport: CanonicalSport;
  globalPopularity: number;
  socialRelevance: number;
  europeanRelevance: number;
  italianRelevance: number;
  leaguePrestige: number;
  narrativeValue: number;
  liquidityExpectation: number;
  premiumScore: number;
  competitionTier: ReturnType<typeof normalizeCompetitionTier>;
};

function participantBlob(g: RawAzuroGame): string {
  const parts = g.participants;
  const arr = Array.isArray(parts) ? [...parts] : [];
  arr.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  return arr.map((p) => String(p?.name || "").toLowerCase()).join(" ");
}

function leagueBlob(g: RawAzuroGame): string {
  return `${g.league?.name || ""} ${g.league?.country?.name || ""}`.toLowerCase();
}

function containsAny(blob: string, phrases: readonly string[]): boolean {
  return phrases.some((p) => blob.includes(p));
}

const GLOBAL_STAR_TENNIS = [
  "sinner",
  "alcaraz",
  "djokovic",
  "medvedev",
  "zverev",
  "ruud",
  "tsitsipas",
  "rublev",
  "swiatek",
  "sabalenka",
  "gauff",
  "rybakina",
] as const;

const GLOBAL_STAR_BASKETBALL = [
  "lakers",
  "celtics",
  "warriors",
  "nuggets",
  "bucks",
  "heat",
  "knicks",
  "mavericks",
  "suns",
  "lebron",
  "curry",
  "jokic",
  "giannis",
  "luka",
] as const;

const GLOBAL_STAR_MOTORSPORT = [
  "verstappen",
  "hamilton",
  "leclerc",
  "norris",
  "russell",
  "sainz",
  "monaco",
  "monza",
  "silverstone",
] as const;

const GLOBAL_STAR_MMA = [
  "mcgregor",
  "adesanya",
  "pereira",
  "makhachev",
  "jones",
  "omalley",
  "volkanovski",
] as const;

const ITALIAN_RELEVANCE = [
  "sinner",
  "berrettini",
  "musetti",
  "serie a",
  "coppa italia",
  "inter",
  "milan",
  "juventus",
  "roma",
  "napoli",
  "italy",
  "italia",
] as const;

const EUROPEAN_RELEVANCE = [
  "euroleague",
  "atp",
  "wta",
  "champions",
  "europa",
  "monaco",
  "madrid",
  "paris",
  "london",
  "milan",
  "rome",
  "barcelona",
] as const;

function tierPrestigePoints(tier: ReturnType<typeof normalizeCompetitionTier>): number {
  switch (tier) {
    case "S":
      return 35;
    case "A":
      return 22;
    case "B":
      return 12;
    case "C":
      return 4;
    default:
      return 0;
  }
}

/**
 * Premium score for multisport curation (0–160+). Football continues to use appeal score in its pipeline.
 */
export function computePremiumScore(g: RawAzuroGame): PremiumScoreBreakdown | null {
  const canonicalSport = canonicalSportFromRaw(g);
  if (!canonicalSport || canonicalSport === "football") return null;

  const blob = `${participantBlob(g)} ${leagueBlob(g)} ${(g.title || "").toLowerCase()}`;
  const tier = normalizeCompetitionTier(canonicalSport, g.league?.name);
  const leaguePrestige = tierPrestigePoints(tier);

  let globalPopularity = 0;
  let socialRelevance = 0;
  let europeanRelevance = containsAny(blob, EUROPEAN_RELEVANCE) ? 18 : 0;
  let italianRelevance = containsAny(blob, ITALIAN_RELEVANCE) ? 20 : 0;
  let narrativeValue = 0;
  let liquidityExpectation = 10;

  switch (canonicalSport) {
    case "tennis": {
      if (containsAny(blob, GLOBAL_STAR_TENNIS)) globalPopularity += 40;
      if (blob.includes("finals") || blob.includes("grand slam")) narrativeValue += 28;
      if (blob.includes("atp") || blob.includes("wta")) socialRelevance += 15;
      break;
    }
    case "basketball": {
      if (containsAny(blob, GLOBAL_STAR_BASKETBALL)) globalPopularity += 38;
      if (blob.includes("playoffs") || blob.includes("finals")) narrativeValue += 30;
      if (blob.includes("nba")) socialRelevance += 22;
      if (blob.includes("euroleague")) europeanRelevance += 12;
      break;
    }
    case "motorsport": {
      if (containsAny(blob, GLOBAL_STAR_MOTORSPORT)) globalPopularity += 42;
      if (blob.includes("grand prix") || blob.includes("formula 1") || blob.includes("f1")) {
        narrativeValue += 35;
      }
      socialRelevance += 18;
      liquidityExpectation += 8;
      break;
    }
    case "mma": {
      if (containsAny(blob, GLOBAL_STAR_MMA)) globalPopularity += 36;
      if (/ufc\s*\d{2,3}/i.test(blob) || blob.includes("numbered")) narrativeValue += 32;
      if (blob.includes("ufc")) socialRelevance += 20;
      break;
    }
    default:
      break;
  }

  const premiumScore = Math.min(
    165,
    globalPopularity +
      socialRelevance +
      europeanRelevance +
      italianRelevance +
      leaguePrestige +
      narrativeValue +
      liquidityExpectation,
  );

  return {
    canonicalSport,
    globalPopularity,
    socialRelevance,
    europeanRelevance,
    italianRelevance,
    leaguePrestige,
    narrativeValue,
    liquidityExpectation,
    premiumScore,
    competitionTier: tier,
  };
}

export function qualifiesMultisportPremiumPool(g: RawAzuroGame): boolean {
  const scored = computePremiumScore(g);
  return scored != null && scored.premiumScore >= MULTISPORT_PREMIUM_POOL_MIN;
}
