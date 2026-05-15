/**
 * Editorial league whitelist — Tier A / B / C (football, curated inventory).
 * Tier C activates only when catalog or candidate pool is thin.
 */

export type LeagueTier = "A" | "B" | "C";

export type LeagueGateVerdict = {
  passesLeagueGate: boolean;
  rejectionReason: string;
  tier: LeagueTier | null;
  tierReason: string;
};

export type LeagueGateOptions = {
  /** Force Tier C (fallback Europe) in addition to A+B. */
  activateTierC?: boolean;
};

export const MIN_CATALOG_SLOTS_FOR_TIER_C = 6;

const ITALY_COUNTRIES = new Set(["italy", "italia"]);
const ENGLAND_COUNTRIES = new Set(["england", "united kingdom", "uk", "great britain"]);
const GERMANY_COUNTRIES = new Set(["germany", "deutschland"]);
const SPAIN_COUNTRIES = new Set(["spain", "españa", "espana"]);
const FRANCE_COUNTRIES = new Set(["france"]);
const NETHERLANDS_COUNTRIES = new Set(["netherlands", "holland"]);
const PORTUGAL_COUNTRIES = new Set(["portugal"]);
const BRAZIL_COUNTRIES = new Set(["brazil", "brasil"]);
const SCOTLAND_COUNTRIES = new Set(["scotland"]);
const TURKEY_COUNTRIES = new Set(["turkey", "türkiye", "turkiye"]);
const BELGIUM_COUNTRIES = new Set(["belgium"]);
const USA_COUNTRIES = new Set([
  "united states",
  "usa",
  "us",
  "united states of america",
]);
const AUSTRIA_COUNTRIES = new Set(["austria", "österreich", "osterreich"]);
const SWITZERLAND_COUNTRIES = new Set(["switzerland", "schweiz", "suisse"]);
const DENMARK_COUNTRIES = new Set(["denmark"]);
const NORWAY_COUNTRIES = new Set(["norway"]);
const SWEDEN_COUNTRIES = new Set(["sweden"]);
const FINLAND_COUNTRIES = new Set(["finland"]);

export function normLeagueSlug(slug: string | undefined): string {
  return (slug || "").toLowerCase().trim().replace(/\s+/g, "-");
}

/** Normalized country token — no substring matching on league names. */
export function normCountry(country: string): string {
  const c = country.toLowerCase().trim();
  if (ITALY_COUNTRIES.has(c)) return "italy";
  if (ENGLAND_COUNTRIES.has(c)) return "england";
  if (GERMANY_COUNTRIES.has(c)) return "germany";
  if (SPAIN_COUNTRIES.has(c)) return "spain";
  if (FRANCE_COUNTRIES.has(c)) return "france";
  if (NETHERLANDS_COUNTRIES.has(c)) return "netherlands";
  if (PORTUGAL_COUNTRIES.has(c)) return "portugal";
  if (BRAZIL_COUNTRIES.has(c)) return "brazil";
  if (SCOTLAND_COUNTRIES.has(c)) return "scotland";
  if (TURKEY_COUNTRIES.has(c)) return "turkey";
  if (BELGIUM_COUNTRIES.has(c)) return "belgium";
  if (USA_COUNTRIES.has(c)) return "usa";
  if (AUSTRIA_COUNTRIES.has(c)) return "austria";
  if (SWITZERLAND_COUNTRIES.has(c)) return "switzerland";
  if (DENMARK_COUNTRIES.has(c)) return "denmark";
  if (NORWAY_COUNTRIES.has(c)) return "norway";
  if (SWEDEN_COUNTRIES.has(c)) return "sweden";
  if (FINLAND_COUNTRIES.has(c)) return "finland";
  return c;
}

function normLeagueName(leagueName: string): string {
  return leagueName.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Hard reject false-positive slugs (never tiered). */
function isHardRejectedSlug(slug: string): string | null {
  const s = normLeagueSlug(slug);
  if (!s) return null;
  if (s === "premier-division" || s.endsWith("-premier-division")) {
    return "slug_rejected:premier-division";
  }
  if (s.includes("premier-league") && s.includes("scottish")) {
    return "slug_rejected:scottish-premier-league";
  }
  if (s.includes("premier-league") && (s.includes("welsh") || s.includes("northern-ireland"))) {
    return "slug_rejected:non-england-premier-league";
  }
  return null;
}

export function isItalianSerieBFixture(
  leagueName: string,
  country: string,
  leagueSlug?: string,
): boolean {
  const cnt = normCountry(country);
  if (cnt !== "italy") return false;

  const slug = normLeagueSlug(leagueSlug);
  if (slug) {
    if (slug.includes("brasileir")) return false;
    if (slug === "serie-b" || slug.endsWith("/serie-b") || /^[a-z0-9-]*serie-b$/.test(slug)) {
      return true;
    }
  }

  const league = normLeagueName(leagueName);
  if (!league || league.includes("brasileir")) return false;
  if (league.includes("serie a") && !league.includes("serie b")) return false;
  if (league === "serie b" || league === "serie bkt") return true;
  if (/^serie b\b/.test(league)) return true;
  return false;
}

export function isItalianSerieA(leagueName: string, country: string, slug?: string): boolean {
  const cnt = normCountry(country);
  if (cnt !== "italy") return false;
  const s = normLeagueSlug(slug);
  if (s) {
    if (s.includes("brasileir")) return false;
    if (s === "serie-a" || (s.includes("serie-a") && !s.includes("serie-b"))) return true;
  }
  const league = normLeagueName(leagueName);
  if (league.includes("brasileir")) return false;
  return league.includes("serie a") && !league.includes("serie b");
}

export function isBrasileiraoSerieA(leagueName: string, country: string, slug?: string): boolean {
  const cnt = normCountry(country);
  if (cnt !== "brazil") return false;
  const s = normLeagueSlug(slug);
  if (s && (s.includes("brasileirao-serie-a") || s.includes("brasileirao"))) return true;
  const league = normLeagueName(leagueName);
  return league.includes("brasileir") && league.includes("serie a");
}

function tierA(
  leagueName: string,
  country: string,
  slug?: string,
): LeagueGateVerdict | null {
  const cnt = normCountry(country);
  const s = normLeagueSlug(slug);
  const league = normLeagueName(leagueName);

  if (
    ((s && s.includes("champions-league")) || league.includes("champions league")) &&
    !league.includes("afc") &&
    !league.includes("caf")
  ) {
    return pass("A", "tier_a:uefa_champions_league");
  }
  if (
    (s && s.includes("europa-league") && !s.includes("conference")) ||
    (league.includes("europa league") && !league.includes("conference"))
  ) {
    return pass("A", "tier_a:uefa_europa_league");
  }
  if ((s && s.includes("conference-league")) || league.includes("conference league")) {
    return pass("A", "tier_a:uefa_conference_league");
  }

  if (league.includes("coppa italia") || (s && s.includes("coppa-italia"))) {
    if (cnt !== "italy") return reject(`tier_a:coppa_italia_country:${cnt}`);
    return pass("A", "tier_a:coppa_italia");
  }

  if (isItalianSerieA(leagueName, country, slug)) {
    return pass("A", "tier_a:serie_a_italy");
  }

  if (
    s === "premier-league" ||
    (s && s.includes("premier-league") && !s.includes("scottish")) ||
    (league.includes("premier league") &&
      !league.includes("scottish") &&
      !league.includes("premier division") &&
      !league.includes("northern ireland"))
  ) {
    if (cnt !== "england") {
      return reject(`tier_a:premier_league_country:${cnt}`);
    }
    return pass("A", "tier_a:premier_league");
  }

  if (
    s === "la-liga" ||
    (s && s.includes("la-liga")) ||
    league.includes("la liga") ||
    league.includes("laliga")
  ) {
    if (cnt !== "spain") return reject(`tier_a:la_liga_country:${cnt}`);
    return pass("A", "tier_a:la_liga");
  }

  if (s === "bundesliga" || (s && s.includes("bundesliga"))) {
    if (cnt === "austria" || (s && s.includes("austria"))) return null;
    if (cnt !== "germany") return reject(`tier_a:bundesliga_country:${cnt}`);
    return pass("A", "tier_a:bundesliga_germany");
  }

  return null;
}

function tierB(
  leagueName: string,
  country: string,
  slug?: string,
): LeagueGateVerdict | null {
  const cnt = normCountry(country);
  const s = normLeagueSlug(slug);
  const league = normLeagueName(leagueName);

  if (isItalianSerieBFixture(leagueName, country, slug)) {
    return pass("B", "tier_b:serie_b_italy");
  }
  if (isBrasileiraoSerieA(leagueName, country, slug)) {
    return pass("B", "tier_b:brasileirao_serie_a");
  }

  if ((s && s.includes("eredivisie")) || league.includes("eredivisie")) {
    if (cnt !== "netherlands") return reject(`tier_b:eredivisie_country:${cnt}`);
    return pass("B", "tier_b:eredivisie");
  }
  if ((s && s.includes("primeira-liga")) || league.includes("primeira liga")) {
    if (cnt !== "portugal") return reject(`tier_b:primeira_liga_country:${cnt}`);
    return pass("B", "tier_b:primeira_liga");
  }
  if (
    (s && s.includes("championship")) ||
    league === "championship" ||
    league.includes("efl championship")
  ) {
    if (cnt !== "england") return reject(`tier_b:championship_country:${cnt}`);
    return pass("B", "tier_b:championship");
  }
  if ((s && s.includes("mls")) || league.includes("major league soccer") || league === "mls") {
    if (cnt !== "usa") return reject(`tier_b:mls_country:${cnt}`);
    return pass("B", "tier_b:mls");
  }
  if ((s && s.includes("libertadores")) || league.includes("copa libertadores")) {
    return pass("B", "tier_b:copa_libertadores");
  }
  if (
    ((s && s.includes("scottish-premiership")) || league.includes("scottish premiership")) &&
    !league.includes("premier league")
  ) {
    if (cnt !== "scotland") return reject(`tier_b:scottish_premiership_country:${cnt}`);
    return pass("B", "tier_b:scottish_premiership");
  }
  if (
    (s && (s.includes("super-lig") || s === "superlig")) ||
    league.includes("super lig") ||
    league.includes("süper lig")
  ) {
    if (cnt !== "turkey") return reject(`tier_b:super_lig_country:${cnt}`);
    return pass("B", "tier_b:super_lig");
  }
  if (league.includes("belgian pro") || (s && s.includes("pro-league") && cnt === "belgium")) {
    if (cnt !== "belgium") return reject(`tier_b:belgian_pro_country:${cnt}`);
    return pass("B", "tier_b:belgian_pro_league");
  }

  return null;
}

function tierC(leagueName: string, country: string, slug?: string): LeagueGateVerdict | null {
  const cnt = normCountry(country);
  const s = normLeagueSlug(slug);
  const league = normLeagueName(leagueName);

  if (
    ((s && s.includes("bundesliga") && s.includes("austria")) || league.includes("bundesliga")) &&
    cnt === "austria"
  ) {
    return pass("C", "tier_c:austria_bundesliga");
  }
  if (
    ((s && s.includes("super-league") && cnt === "switzerland") || league.includes("swiss super league")) &&
    cnt === "switzerland"
  ) {
    return pass("C", "tier_c:swiss_super_league");
  }
  if (
    ((s && s.includes("superliga") && cnt === "denmark") || league.includes("danish superliga")) &&
    cnt === "denmark"
  ) {
    return pass("C", "tier_c:danish_superliga");
  }
  if (((s && s.includes("eliteserien")) || league.includes("eliteserien")) && cnt === "norway") {
    return pass("C", "tier_c:norway_eliteserien");
  }
  if (((s && s.includes("allsvenskan")) || league.includes("allsvenskan")) && cnt === "sweden") {
    return pass("C", "tier_c:sweden_allsvenskan");
  }
  if (((s && s.includes("veikkausliiga")) || league.includes("veikkausliiga")) && cnt === "finland") {
    return pass("C", "tier_c:finland_veikkausliiga");
  }

  return null;
}

function pass(tier: LeagueTier, tierReason: string): LeagueGateVerdict {
  return {
    passesLeagueGate: true,
    rejectionReason: tierReason,
    tier,
    tierReason,
  };
}

function reject(rejectionReason: string): LeagueGateVerdict {
  return {
    passesLeagueGate: false,
    rejectionReason,
    tier: null,
    tierReason: rejectionReason,
  };
}

export function classifyLeagueTier(
  leagueName: string,
  country: string,
  leagueSlug?: string,
): LeagueGateVerdict {
  const slugNorm = normLeagueSlug(leagueSlug);
  const hard = slugNorm ? isHardRejectedSlug(slugNorm) : null;
  if (hard) return reject(hard);

  if (!leagueName.trim() && !slugNorm) {
    return reject("missing_league_name");
  }

  return (
    tierA(leagueName, country, leagueSlug) ??
    tierB(leagueName, country, leagueSlug) ??
    tierC(leagueName, country, leagueSlug) ??
    reject("league_not_in_editorial_tiers")
  );
}

export function explainAllowedLeagueRejection(
  leagueName: string,
  country: string,
  leagueSlug?: string,
  options?: LeagueGateOptions,
): LeagueGateVerdict {
  const cls = classifyLeagueTier(leagueName, country, leagueSlug);
  if (!cls.tier) return cls;
  if (cls.tier === "A" || cls.tier === "B") return cls;
  if (cls.tier === "C" && options?.activateTierC) return cls;
  return {
    passesLeagueGate: false,
    rejectionReason: "tier_c_inactive",
    tier: "C",
    tierReason: `${cls.tierReason}:awaiting_thin_catalog`,
  };
}

export function isAllowedLeague(
  leagueName: string,
  country: string,
  leagueSlug?: string,
  options?: LeagueGateOptions,
): boolean {
  return explainAllowedLeagueRejection(leagueName, country, leagueSlug, options).passesLeagueGate;
}

/** Minimum appeal to enter curation pool without prestige/UCL bypass, per editorial tier. */
export const APPEAL_THRESHOLDS_BY_TIER: Readonly<Record<LeagueTier, number>> = {
  A: 110,
  B: 80,
  C: 60,
};

export const DEFAULT_TIER_APPEAL_THRESHOLD = APPEAL_THRESHOLDS_BY_TIER.A;

export function getTierAppealThreshold(tier: LeagueTier | null | undefined): number {
  if (tier === "B") return APPEAL_THRESHOLDS_BY_TIER.B;
  if (tier === "C") return APPEAL_THRESHOLDS_BY_TIER.C;
  if (tier === "A") return APPEAL_THRESHOLDS_BY_TIER.A;
  return DEFAULT_TIER_APPEAL_THRESHOLD;
}

export function getAppealThresholdsByTier(): Readonly<Record<LeagueTier, number>> {
  return APPEAL_THRESHOLDS_BY_TIER;
}
