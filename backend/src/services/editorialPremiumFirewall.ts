import type { RawAzuroGame } from "./azuroCuratorGraphql";
import { canonicalSportFromRaw } from "./canonicalSportTaxonomy";
import {
  isBrasileiraoSerieA,
  isItalianSerieA,
  isItalianSerieBFixture,
  normCountry,
  normLeagueSlug,
} from "./editorialLeagueTiers";
import { isEmergencyRelaxMode, isEmergencyInventoryMode } from "./emergencyRelaxMode";
import { MULTISPORT_SLOT_PREFER_MIN } from "./premiumSportScoring";

const TIER_B_FRAGMENTS = [
  "dortmund",
  "leipzig",
  "leverkusen",
  "atalanta",
  "roma",
  "fiorentina",
  "lazio",
  "sevilla",
  "atletico",
  "atlético",
  "bilbao",
  "real sociedad",
] as const;

function countPremiumTierBHits(blob: string): number {
  let n = 0;
  for (const p of TIER_B_FRAGMENTS) {
    if (blob.includes(p)) n++;
  }
  return n;
}

function hasControlledPremiumPair(blob: string): boolean {
  const pairs: [string, string][] = [
    ["juventus", "fiorentina"],
    ["roma", "atalanta"],
    ["dortmund", "leipzig"],
  ];
  return pairs.some(([a, b]) => blob.includes(a) && blob.includes(b));
}

/**
 * P5 — strict premium whitelist: catalogue + multisport must not ship filler that
 * conflicts with European premium editorial copy.
 */
export const STRICT_PREMIUM_WHITELIST_MODE = true;

/**
 * Strict premium ladder for catalog slots — default OFF (interest-first).
 * Set `PREDICTIO_LEGACY_STRICT_PREMIUM=true` to restore strict ideology.
 */
export function isStrictPremiumWhitelistEffective(): boolean {
  if (isEmergencyRelaxMode() || isEmergencyInventoryMode()) return false;
  if (String(process.env.PREDICTIO_LEGACY_STRICT_PREMIUM ?? "").trim().toLowerCase() === "true") {
    return STRICT_PREMIUM_WHITELIST_MODE;
  }
  return false;
}

function sortParticipants(g: RawAzuroGame): Array<{ name?: string; sortOrder?: number }> {
  const parts = g.participants;
  const arr = Array.isArray(parts) ? [...parts] : [];
  arr.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  return arr;
}

function teamBlobLower(g: RawAzuroGame): string {
  const arr = sortParticipants(g);
  return ` ${arr.map((p) => String(p?.name || "").toLowerCase()).join(" ")} `;
}

/** Founder “elite club” list — word-safe: never match Internacional via plain `inter`. */
function hasFounderWhitelistClub(blob: string): boolean {
  const patterns = [
    "real madrid",
    "fc barcelona",
    "barcelona",
    "arsenal",
    "liverpool",
    "manchester city",
    "bayern",
    "fc bayern",
    "juventus",
    "ssc napoli",
    "napoli",
    "paris saint",
    "psg",
  ] as const;
  for (const p of patterns) {
    if (blob.includes(p)) return true;
  }
  if (/\binter\b/.test(blob) || blob.includes("internazionale")) return true;
  if (/\bac milan\b/.test(blob)) return true;
  if (/\bmilan\b/.test(blob) && !blob.includes("nashville")) return true;
  return false;
}

/** Football: ONLY UCL + Big-5 top flights (no EL/Conference, no Brazil, no Serie B, no Tier-B/C leagues). */
export function isStrictHeadlineFootballLeague(
  leagueName: string,
  country: string,
  leagueSlug?: string,
): boolean {
  const ln = leagueName.toLowerCase();
  const cnt = normCountry(country);

  if (cnt === "brazil" || isBrasileiraoSerieA(leagueName, country, leagueSlug)) return false;
  if (isItalianSerieBFixture(leagueName, country, leagueSlug)) return false;
  if (cnt === "finland" && ln.includes("veikkausliiga")) return false;

  if (ln.includes("champions league") && !ln.includes("afc") && !ln.includes("caf")) return true;

  if (ln.includes("europa league") && !ln.includes("conference")) return false;
  if (ln.includes("conference league")) return false;

  if (isItalianSerieA(leagueName, country, leagueSlug)) return true;

  if (
    (ln.includes("coppa italia") ||
      (leagueSlug && normLeagueSlug(leagueSlug).includes("coppa-italia"))) &&
    cnt === "italy"
  ) {
    return true;
  }
  if (ln.includes("supercoppa") && cnt === "italy") return true;

  if (
    ln.includes("premier league") &&
    !ln.includes("scottish") &&
    !ln.includes("welsh") &&
    !ln.includes("northern ireland") &&
    cnt === "england"
  ) {
    return true;
  }

  if ((ln.includes("la liga") || ln.includes("laliga")) && cnt === "spain") return true;
  if (ln.includes("bundesliga") && cnt === "germany") return true;
  if (ln.includes("ligue 1") && cnt === "france") return true;

  return false;
}

export function strictPremiumFootballPasses(g: RawAzuroGame, importanceScore: number): boolean {
  if (!isStrictPremiumWhitelistEffective()) return true;
  if (canonicalSportFromRaw(g) !== "football") return false;

  const leagueName = g.league?.name ?? "";
  const country = g.league?.country?.name ?? "";
  const slug = g.league?.slug;

  if (!isStrictHeadlineFootballLeague(leagueName, country, slug)) return false;

  const blob = teamBlobLower(g);
  const imp = importanceScore;
  const ln = leagueName.toLowerCase();
  const ucl = ln.includes("champions league") && !ln.includes("afc") && !ln.includes("caf");
  const founder = hasFounderWhitelistClub(blob);
  const tb = countPremiumTierBHits(blob);
  const pair = hasControlledPremiumPair(blob);
  const serieA = isItalianSerieA(leagueName, country, slug);

  return (
    founder ||
    (ucl && imp >= 100) ||
    (tb >= 2 && imp >= 86) ||
    (pair && serieA && imp >= 82) ||
    (ucl && tb >= 1 && imp >= 96)
  );
}

export function strictPremiumMultisportPasses(g: RawAzuroGame, importanceScore: number): boolean {
  if (!isStrictPremiumWhitelistEffective()) return true;
  const sport = canonicalSportFromRaw(g);
  const leagueTitle = `${g.league?.name || ""} ${g.title || ""}`.toLowerCase();
  const blob = teamBlobLower(g);
  const minMs = MULTISPORT_SLOT_PREFER_MIN;
  const imp = importanceScore;

  if (sport === "tennis") {
    const gsOrMasters =
      /grand slam|wimbledon|roland|australian open|us open|french open/i.test(leagueTitle) ||
      /\bmasters\b/.test(leagueTitle) ||
      /\batp finals\b/.test(leagueTitle);
    const atp500 =
      /\batp\b/.test(leagueTitle) &&
      (/\b500\b/.test(leagueTitle) ||
        /indian wells|miami open|rome|madrid|monte carlo|canada masters|cincinnati|shanghai|paris masters/i.test(
          leagueTitle,
        ));
    const star = /\b(sinner|alcaraz|djokovic|nadal)\b/i.test(blob);
    const lateDraw = /\b(quarter|semi|semifinal|semi-final|round of 16|round of sixteen)\b/i.test(
      leagueTitle + blob,
    );
    const compOk =
      /\batp\b/.test(leagueTitle) || /\bwta\b/.test(leagueTitle) || gsOrMasters;
    if (!compOk) return false;
    if ((gsOrMasters || /\bmasters\b/.test(leagueTitle)) && star && imp >= minMs) return true;
    if (atp500 && imp >= 86) return true;
    if (star && imp >= minMs) return true;
    if (lateDraw && imp >= 88 && /\batp\b/.test(leagueTitle)) return true;
    return false;
  }

  if (sport === "basketball") {
    const nba =
      /\bnba\b/.test(leagueTitle) || leagueTitle.includes("national basketball association");
    const euro = /euroleague/.test(leagueTitle);
    const playoff =
      /playoff|play-in|finals|conference|semifinal|semi-final/.test(leagueTitle);
    return (nba || euro) && playoff && imp >= minMs;
  }

  if (sport === "motorsport") {
    const f1 =
      /\bformula\s*1\b|\bf1\b|grand prix/.test(leagueTitle) ||
      /\bformula\s*1\b|\bf1\b|grand prix/.test(blob);
    const monaco = /monaco|monza|silverstone|spa-francorchamps|spa francorchamps/i.test(
      leagueTitle + blob,
    );
    const narrative = /ferrari|leclerc|verstappen|hamilton|monaco gp/i.test(leagueTitle + blob);
    if (!f1) return false;
    return monaco || narrative || imp >= 88;
  }

  if (sport === "mma") {
    const ufc = /\bufc\b/.test(leagueTitle) || /\bufc\b/.test(blob);
    const titleCard =
      /\bufc\s*\d+/.test(leagueTitle) || /title|championship|main event/i.test(leagueTitle);
    return ufc && imp >= minMs && (titleCard || imp >= 84);
  }

  return false;
}

export function passesStrictPremiumScoredItalian(it: {
  raw: RawAzuroGame;
  importanceScore: number;
}): boolean {
  if (!isStrictPremiumWhitelistEffective()) return true;
  const sport = canonicalSportFromRaw(it.raw);
  if (sport === "football") return strictPremiumFootballPasses(it.raw, it.importanceScore);
  return strictPremiumMultisportPasses(it.raw, it.importanceScore);
}

/**
 * Protocol continuity (Tier D): canonical market continuity > editorial purity.
 * Superset of strict ladder — used ONLY to reach CATALOG_TARGET_SIZE without garbage leagues.
 */
export function isContinuityHeadlineFootballLeague(
  leagueName: string,
  country: string,
  leagueSlug?: string,
): boolean {
  if (isStrictHeadlineFootballLeague(leagueName, country, leagueSlug)) return true;
  const ln = leagueName.toLowerCase();
  const cnt = normCountry(country);
  if (cnt === "brazil" || isBrasileiraoSerieA(leagueName, country, leagueSlug)) return false;
  if (isItalianSerieBFixture(leagueName, country, leagueSlug)) return false;
  if (cnt === "finland" && ln.includes("veikkausliiga")) return false;
  const uefaEl = ln.includes("europa league") && !ln.includes("conference");
  const uefaConf = ln.includes("conference league");
  if (!uefaEl && !uefaConf) return false;
  const banned = [
    "senegal",
    "thailand",
    "saudi",
    "qatar",
    "malaysia",
  ];
  if (banned.some((b) => cnt.includes(b))) return false;
  return true;
}

export function strictPremiumFootballContinuityOnly(g: RawAzuroGame, importanceScore: number): boolean {
  if (canonicalSportFromRaw(g) !== "football") return false;
  const leagueName = g.league?.name ?? "";
  const country = g.league?.country?.name ?? "";
  const slug = g.league?.slug;
  if (!isContinuityHeadlineFootballLeague(leagueName, country, slug)) return false;
  const imp = importanceScore;
  if (imp < 64) return false;
  const blob = teamBlobLower(g);
  const founder = hasFounderWhitelistClub(blob);
  const ln = leagueName.toLowerCase();
  const ucl = ln.includes("champions league") && !ln.includes("afc") && !ln.includes("caf");
  const el = ln.includes("europa league") && !ln.includes("conference");
  const conf = ln.includes("conference league");
  if (ucl && imp >= 92) return true;
  if ((el || conf) && imp >= 70) return true;
  if (isStrictHeadlineFootballLeague(leagueName, country, slug) && (founder || imp >= 72))
    return true;
  if (isItalianSerieA(leagueName, country, slug) && imp >= 74) return true;
  return false;
}

export function strictPremiumMultisportContinuityOnly(g: RawAzuroGame, importanceScore: number): boolean {
  const sport = canonicalSportFromRaw(g);
  if (sport == null || sport === "football") return false;
  const leagueTitle = `${g.league?.name || ""} ${g.title || ""}`.toLowerCase();
  const blob = teamBlobLower(g);
  const imp = importanceScore;
  const minRel = 72;

  if (sport === "tennis") {
    const compOk =
      /\batp\b/.test(leagueTitle) || /\bwta\b/.test(leagueTitle) || /grand slam|wimbledon|roland/i.test(leagueTitle);
    return compOk && imp >= minRel;
  }
  if (sport === "basketball") {
    const nba = /\bnba\b/.test(leagueTitle);
    const euro = /euroleague/.test(leagueTitle);
    return ((nba || euro) && imp >= minRel) || (nba && imp >= 78);
  }
  if (sport === "motorsport") {
    const f1 =
      /\bformula\s*1\b|\bf1\b|grand prix/.test(leagueTitle) || /\bformula\s*1\b|\bf1\b|grand prix/.test(blob);
    return f1 && imp >= 72;
  }
  if (sport === "mma") {
    const ufc = /\bufc\b/.test(leagueTitle) || /\bufc\b/.test(blob);
    return ufc && imp >= 72;
  }
  return false;
}

export function passesProtocolContinuityTierD(it: {
  raw: RawAzuroGame;
  importanceScore: number;
}): boolean {
  if (!isStrictPremiumWhitelistEffective()) return true;
  if (passesStrictPremiumScoredItalian(it)) return true;
  const sport = canonicalSportFromRaw(it.raw);
  if (sport === "football") {
    return strictPremiumFootballContinuityOnly(it.raw, it.importanceScore);
  }
  return strictPremiumMultisportContinuityOnly(it.raw, it.importanceScore);
}
