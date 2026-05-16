import type { RawAzuroGame } from "./azuroCuratorGraphql";

/** Protocol-level sport identity (UI + liquidity + catalog). */
export type CanonicalSport =
  | "football"
  | "tennis"
  | "basketball"
  | "motorsport"
  | "mma"
  | "hockey";

export type RegistrySportSlug = CanonicalSport | "unknown";

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
  hockey: "hockey",
  "ice-hockey": "hockey",
  "ice hockey": "hockey",
};

const HOCKEY_LEAGUE_RE =
  /\b(iihf|nhl|khl|ahl|shl|liiga|del\b|hockey|ice hockey|world championship)\b/i;

const MMA_LEAGUE_RE = /\b(ufc|bellator|pfl|mma|mixed martial)\b/i;

const FOOTBALL_LEAGUE_RE =
  /\b(serie a|premier league|la liga|laliga|bundesliga|ligue 1|eredivisie|primeira liga|veikkausliiga|champions league|europa league|conference league|mls|brasileir|copa libertadores|world cup|euro 20|nations league|segunda|liga mx|super lig|jupiler|scottish premiership)\b/i;

/** Map Azuro sport slug/name → canonical sport. Unknown → null. */
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
  if (slug.includes("hockey") || name.includes("hockey") || name.includes("ice hockey")) {
    return "hockey";
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

/** League/title inference overrides wrong Azuro sport tags (e.g. IIHF → football). */
export function inferSportFromLeagueAndTitle(
  leagueName?: string | null,
  title?: string | null,
): CanonicalSport | null {
  const blob = `${leagueName ?? ""} ${title ?? ""}`.trim();
  if (!blob) return null;
  if (HOCKEY_LEAGUE_RE.test(blob)) return "hockey";
  if (MMA_LEAGUE_RE.test(blob)) return "mma";
  if (FOOTBALL_LEAGUE_RE.test(blob)) return "football";
  return null;
}

/**
 * Authoritative sport for registry persistence.
 * League inference wins over Azuro slug (fixes hockey/MMA mis-tagged as football).
 * Never defaults unknown sports to football.
 */
export function resolveCanonicalSportFromRaw(g: RawAzuroGame): RegistrySportSlug {
  const fromLeague = inferSportFromLeagueAndTitle(g.league?.name, g.title);
  if (fromLeague) return fromLeague;

  const fromAzuro = normalizeSport(g.sport?.name, g.sport?.slug);
  if (fromAzuro) return fromAzuro;

  return "unknown";
}

export function canonicalSportFromRaw(g: RawAzuroGame): CanonicalSport | null {
  const resolved = resolveCanonicalSportFromRaw(g);
  return resolved === "unknown" ? null : resolved;
}

export function resolveRegistrySportFields(g: RawAzuroGame): {
  sport: string;
  sportSlug: string;
} {
  const canonical = resolveCanonicalSportFromRaw(g);
  if (canonical === "unknown") {
    return { sport: "unknown", sportSlug: "unknown" };
  }
  const slug = canonicalSportToUiSlug(canonical);
  return { sport: slug, sportSlug: slug };
}

export function isFootballSportSlug(sportSlug?: string | null): boolean {
  const s = (sportSlug ?? "").trim().toLowerCase();
  return s === "football" || s === "soccer";
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
    sport === "mma" ||
    sport === "hockey"
  );
}
