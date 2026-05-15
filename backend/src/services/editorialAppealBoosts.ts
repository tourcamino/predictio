/**
 * Editorial appeal boosts — historic club prestige + narrative fixtures.
 * Applied inside computeAppealScore with a hard cap (does not change tier thresholds).
 */

export const MAX_EDITORIAL_APPEAL_BOOST = 30;

export const NARRATIVE_DERBY_BOOST = 25;
export const NARRATIVE_RIVALRY_BOOST = 15;
export const NARRATIVE_PROMOTION_PLAYOFF_BOOST = 10;
export const NARRATIVE_RELEGATION_BOOST = 10;

export type EditorialFixtureContext = {
  home: string;
  away: string;
  leagueName?: string;
  countryName?: string;
};

/** Longest patterns first — one boost per club (highest match wins). */
const EDITORIAL_CLUB_PRESTIGE: ReadonlyArray<{ patterns: readonly string[]; boost: number }> = [
  { patterns: ["union berlin", "fc union berlin", "1 fc union berlin"], boost: 15 },
  { patterns: ["sampdoria", "uc sampdoria"], boost: 20 },
  { patterns: ["palermo", "palermo fc"], boost: 20 },
  { patterns: ["parma", "parma calcio"], boost: 20 },
  { patterns: ["bari", "ssc bari"], boost: 15 },
  { patterns: ["venezia", "venezia fc"], boost: 15 },
  { patterns: ["como", "como 1907"], boost: 15 },
  { patterns: ["pisa", "ac pisa"], boost: 10 },
  { patterns: ["genoa", "genoa cfc"], boost: 10 },
  { patterns: ["torino", "torino fc"], boost: 10 },
  { patterns: ["flamengo", "cr flamengo"], boost: 15 },
  { patterns: ["corinthians", "sc corinthians"], boost: 15 },
  { patterns: ["palmeiras", "se palmeiras"], boost: 15 },
  { patterns: ["sao paulo", "são paulo"], boost: 15 },
  { patterns: ["gremio", "grêmio"], boost: 12 },
  { patterns: ["internacional", "sc internacional"], boost: 12 },
  { patterns: ["ajax"], boost: 12 },
  { patterns: ["feyenoord"], boost: 12 },
  { patterns: ["psv"], boost: 12 },
];

const EDITORIAL_DERBY_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["palermo", "catania"],
  ["palermo", "messina"],
  ["bari", "foggia"],
  ["bari", "lecce"],
  ["genoa", "sampdoria"],
  ["reggiana", "parma"],
  ["pisa", "livorno"],
  ["flamengo", "fluminense"],
  ["corinthians", "palmeiras"],
  ["gremio", "internacional"],
  ["ajax", "feyenoord"],
  ["celtic", "rangers"],
];

const EDITORIAL_RIVALRY_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["palermo", "bari"],
  ["bari", "parma"],
  ["palermo", "bari"],
  ["sampdoria", "genoa"],
  ["torino", "juventus"],
  ["napoli", "palermo"],
  ["flamengo", "vasco da gama"],
  ["corinthians", "sao paulo"],
  ["benfica", "sporting"],
];

const CLUB_PREFIX_TOKENS = new Set([
  "ac",
  "as",
  "fc",
  "sc",
  "ss",
  "us",
  "uc",
  "cd",
  "cf",
  "rc",
  "sv",
  "vfb",
  "tsg",
  "calcio",
  "club",
  "sporting",
  "atletico",
]);

export function normalizeTeamNameForEditorial(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whole-token / phrase match — avoids "inter" in "internacional". */
export function teamNameContainsPhrase(normalizedTeam: string, phrase: string): boolean {
  const p = normalizeTeamNameForEditorial(phrase);
  if (!p) return false;
  const tokens = normalizedTeam.split(" ").filter(Boolean);
  const phraseTokens = p.split(" ").filter(Boolean);
  if (phraseTokens.length === 1) {
    return tokens.includes(phraseTokens[0]!);
  }
  const joined = ` ${tokens.join(" ")} `;
  return joined.includes(` ${phraseTokens.join(" ")} `);
}

function stripClubPrefixes(normalized: string): string {
  const tokens = normalized.split(" ").filter(Boolean);
  const filtered = tokens.filter((t) => !CLUB_PREFIX_TOKENS.has(t));
  return filtered.join(" ");
}

export function getClubPrestigeBoost(teamName: string): number {
  const raw = normalizeTeamNameForEditorial(teamName);
  const stripped = stripClubPrefixes(raw);
  const candidates = stripped && stripped !== raw ? [raw, stripped] : [raw];

  let best = 0;
  for (const norm of candidates) {
    if (!norm) continue;
    for (const entry of EDITORIAL_CLUB_PRESTIGE) {
      for (const pattern of entry.patterns) {
        if (teamNameContainsPhrase(norm, pattern) && entry.boost > best) {
          best = entry.boost;
        }
      }
    }
  }
  return best;
}

function pairMatchesEditorial(home: string, away: string, a: string, b: string): boolean {
  const h = normalizeTeamNameForEditorial(home);
  const aw = normalizeTeamNameForEditorial(away);
  return (
    (teamNameContainsPhrase(h, a) && teamNameContainsPhrase(aw, b)) ||
    (teamNameContainsPhrase(h, b) && teamNameContainsPhrase(aw, a))
  );
}

export function getNarrativeFixtureBoost(ctx: EditorialFixtureContext): number {
  const home = ctx.home;
  const away = ctx.away;

  for (const [a, b] of EDITORIAL_DERBY_PAIRS) {
    if (pairMatchesEditorial(home, away, a, b)) return NARRATIVE_DERBY_BOOST;
  }
  for (const [a, b] of EDITORIAL_RIVALRY_PAIRS) {
    if (pairMatchesEditorial(home, away, a, b)) return NARRATIVE_RIVALRY_BOOST;
  }

  // No standings / table metadata on Azuro feed — promotion/relegation boosts omitted.
  return 0;
}

export function computeFixtureClubPrestigeBoost(home: string, away: string): number {
  return getClubPrestigeBoost(home) + getClubPrestigeBoost(away);
}

export type EditorialAppealBoostBreakdown = {
  clubPrestigeBoostRaw: number;
  narrativeFixtureBoost: number;
  editorialBoostApplied: number;
};

export function computeEditorialAppealBoosts(
  home: string,
  away: string,
  ctx?: Pick<EditorialFixtureContext, "leagueName" | "countryName">,
): EditorialAppealBoostBreakdown {
  const clubPrestigeBoostRaw = computeFixtureClubPrestigeBoost(home, away);
  const narrativeFixtureBoost = getNarrativeFixtureBoost({
    home,
    away,
    leagueName: ctx?.leagueName,
    countryName: ctx?.countryName,
  });
  const editorialBoostApplied = Math.min(
    MAX_EDITORIAL_APPEAL_BOOST,
    clubPrestigeBoostRaw + narrativeFixtureBoost,
  );
  return { clubPrestigeBoostRaw, narrativeFixtureBoost, editorialBoostApplied };
}
