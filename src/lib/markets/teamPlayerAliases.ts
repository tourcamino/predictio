/**
 * Football team / player / competition aliases for curated market search.
 * Keys are normalized tokens (see searchNormalization.normalizeSearchToken).
 */
import { normalizeSearchToken, tokenizeSearchQuery } from "~/lib/markets/searchNormalization";

/** alias token → extra searchable tokens (already normalized). */
export const TEAM_PLAYER_ALIASES: Record<string, string[]> = {
  // Players → clubs
  lautaro: ["inter", "internazionale"],
  lukaku: ["inter", "internazionale", "roma"],
  haaland: ["manchester", "city"],
  kane: ["bayern", "munich"],
  mbappe: ["psg", "paris"],
  vinicius: ["real", "madrid"],
  bellingham: ["real", "madrid"],
  saka: ["arsenal"],
  odegaard: ["arsenal"],
  salah: ["liverpool"],
  palmer: ["chelsea"],
  // Club nicknames
  juve: ["juventus"],
  inter: ["internazionale"],
  milan: ["milan", "ac"],
  barca: ["barcelona"],
  barcelona: ["barcelona"],
  real: ["real", "madrid"],
  madrid: ["real", "madrid"],
  bayern: ["bayern", "munich"],
  munich: ["bayern", "munich"],
  city: ["manchester", "city"],
  united: ["manchester", "united"],
  arsenal: ["arsenal"],
  liverpool: ["liverpool"],
  chelsea: ["chelsea"],
  spurs: ["tottenham"],
  tottenham: ["tottenham"],
  wolves: ["wolverhampton"],
  newcastle: ["newcastle"],
  west: ["west", "ham"],
  ham: ["west", "ham"],
  // German
  union: ["union", "berlin"],
  hertha: ["hertha", "berlin"],
  dortmund: ["dortmund", "borussia"],
  bvb: ["dortmund", "borussia"],
  leverkusen: ["leverkusen", "bayer"],
  // Competitions
  champions: ["champions", "league", "ucl"],
  ucl: ["champions", "league"],
  europa: ["europa", "league"],
  premier: ["premier", "league", "epl"],
  epl: ["premier", "league"],
  serie: ["serie"],
  laliga: ["la", "liga"],
  liga: ["liga"],
  bundesliga: ["bundesliga"],
  mls: ["mls"],
  // Derby / narrative
  derby: ["derby"],
  clasico: ["real", "madrid", "barcelona"],
};

const COMPETITION_PHRASE_ALIASES: Record<string, string[]> = {
  "champions league": ["champions", "league", "ucl"],
  "premier league": ["premier", "league", "epl"],
  "serie a": ["serie"],
  "la liga": ["la", "liga"],
  "bundesliga": ["bundesliga"],
  "europa league": ["europa", "league"],
};

/**
 * Expand query tokens with aliases (deterministic, no LLM).
 */
export function expandSearchTokens(tokens: string[]): string[] {
  const expanded = new Set<string>();
  for (const token of tokens) {
    expanded.add(token);
    const direct = TEAM_PLAYER_ALIASES[token];
    if (direct) direct.forEach((t) => expanded.add(t));
  }
  const phrase = tokens.join(" ");
  for (const [key, vals] of Object.entries(COMPETITION_PHRASE_ALIASES)) {
    if (phrase.includes(key)) vals.forEach((t) => expanded.add(t));
  }
  return [...expanded];
}

/** Full pipeline: raw query → expanded normalized token set. */
export function expandSearchQuery(rawQuery: string): {
  tokens: string[];
  expandedTokens: string[];
} {
  const tokens = tokenizeSearchQuery(rawQuery);
  const expandedTokens = expandSearchTokens(tokens);
  return { tokens, expandedTokens };
}

export function logSearchAliasExpansion(
  rawQuery: string,
  expandedTokens: string[],
  matchedMarketIds?: string[],
): void {
  console.log(
    JSON.stringify({
      tag: "search_alias_expansion",
      raw: rawQuery.slice(0, 120),
      expanded: expandedTokens.slice(0, 24),
      matchedMarketIds: matchedMarketIds?.slice(0, 12),
    }),
  );
}
