import type { RawAzuroGame } from "./azuroCuratorGraphql";

/** Protocol-level sport identity (UI + liquidity + catalog). */
export type CanonicalSport =
  | "football"
  | "tennis"
  | "basketball"
  | "motorsport"
  | "mma";

export type CompetitionTier = "S" | "A" | "B" | "C" | "unknown";

const AZURO_SPORT_ALIASES: Readonly<Record<string, CanonicalSport>> = {
  football: "football",
  soccer: "football",
  tennis: "tennis",
  basketball: "basketball",
  "formula-1": "motorsport",
  "formula 1": "motorsport",
  f1: "motorsport",
  motorsport: "motorsport",
  racing: "motorsport",
  mma: "mma",
  "mixed martial arts": "mma",
  ufc: "mma",
};

/** Map Azuro sport slug/name → canonical sport. Unknown → null (excluded from multisport path). */
export function normalizeSport(
  sportName?: string | null,
  sportSlug?: string | null,
): CanonicalSport | null {
  const slug = (sportSlug || "").trim().toLowerCase();
  const name = (sportName || "").trim().toLowerCase();
  if (slug && AZURO_SPORT_ALIASES[slug]) return AZURO_SPORT_ALIASES[slug];
  if (name && AZURO_SPORT_ALIASES[name]) return AZURO_SPORT_ALIASES[name];
  if (slug.includes("football") || slug === "soccer" || name.includes("football") || name === "soccer") {
    return "football";
  }
  if (slug.includes("tennis") || name.includes("tennis")) return "tennis";
  if (slug.includes("basketball") || name.includes("basketball")) return "basketball";
  if (
    slug.includes("formula") ||
    slug.includes("f1") ||
    slug.includes("motorsport") ||
    name.includes("formula 1") ||
    name.includes("f1")
  ) {
    return "motorsport";
  }
  if (slug.includes("mma") || slug.includes("ufc") || name.includes("mma") || name.includes("ufc")) {
    return "mma";
  }
  return null;
}

export function canonicalSportFromRaw(g: RawAzuroGame): CanonicalSport | null {
  return normalizeSport(g.sport?.name, g.sport?.slug);
}

/** UI slug (frontend `SPORT_METADATA` keys — motorsport maps to `f1`). */
export function canonicalSportToUiSlug(sport: CanonicalSport): string {
  if (sport === "motorsport") return "f1";
  return sport;
}

export function normalizeLeague(leagueName?: string | null, countryName?: string | null): string {
  const league = (leagueName || "").trim().replace(/\s+/g, " ");
  const country = (countryName || "").trim();
  if (!league && !country) return "Unknown";
  if (!country) return league;
  if (!league) return country;
  return `${league} · ${country}`;
}

const TIER_S_PATTERNS = [
  "champions league",
  "uefa champions",
  "atp finals",
  "wta finals",
  "nba finals",
  "nba playoffs",
  "euroleague final",
  "formula 1",
  "f1",
  "ufc 3",
  "ufc 4",
  "ufc 5",
];

const TIER_A_PATTERNS = [
  "premier league",
  "serie a",
  "la liga",
  "bundesliga",
  "ligue 1",
  "atp",
  "wta",
  "grand slam",
  "wimbledon",
  "roland garros",
  "us open",
  "australian open",
  "nba",
  "euroleague",
  "copa libertadores",
  "ufc",
];

/** Editorial competition tier from league + sport (football uses editorial tiers separately). */
export function normalizeCompetitionTier(
  sport: CanonicalSport | null,
  leagueName?: string | null,
): CompetitionTier {
  const ln = (leagueName || "").toLowerCase();
  if (!ln) return "unknown";
  if (TIER_S_PATTERNS.some((p) => ln.includes(p))) return "S";
  if (TIER_A_PATTERNS.some((p) => ln.includes(p))) return "A";
  if (sport === "tennis" && (ln.includes("atp") || ln.includes("wta"))) return "A";
  if (sport === "basketball" && ln.includes("nba")) return "A";
  if (sport === "motorsport") return "S";
  if (sport === "mma" && ln.includes("ufc")) return "A";
  if (sport === "football") return "B";
  return "C";
}

export function isSupportedCanonicalSport(sport: CanonicalSport | null): sport is CanonicalSport {
  return (
    sport === "football" ||
    sport === "tennis" ||
    sport === "basketball" ||
    sport === "motorsport" ||
    sport === "mma"
  );
}
