import type { SeedMarket } from "~/data/seedMarkets";
import {
  expandSearchQuery,
  logSearchAliasExpansion,
} from "~/lib/markets/teamPlayerAliases";
import { normalizeSearchToken } from "~/lib/markets/searchNormalization";

const DERBY_HINTS = ["derby", "clasico", "derbi"];

function buildMarketSearchHaystack(market: SeedMarket): string {
  const teams = market.event.teams.join(" ");
  const parts = [
    market.id,
    market.question,
    market.event.name,
    market.competition,
    market.competitionSlug?.replace(/-/g, " "),
    teams,
    market.event.location ?? "",
    market.description ?? "",
    market.sport,
  ];
  const slug = market.competitionSlug?.toLowerCase() ?? "";
  if (slug.includes("champions")) parts.push("champions league ucl");
  if (slug.includes("premier")) parts.push("premier league epl");
  if (slug.includes("serie")) parts.push("serie a");
  if (slug.includes("bundesliga")) parts.push("bundesliga");
  if (slug.includes("liga")) parts.push("la liga");
  const t0 = market.event.teams[0]?.toLowerCase() ?? "";
  const t1 = market.event.teams[1]?.toLowerCase() ?? "";
  if (DERBY_HINTS.some((d) => t0.includes(d) || t1.includes(d) || market.event.name.toLowerCase().includes(d))) {
    parts.push("derby rivalry");
  }
  return normalizeSearchToken(parts.filter(Boolean).join(" "));
}

/**
 * Token + alias aware match for curated catalog rows.
 */
export function marketMatchesSearch(market: SeedMarket, rawQuery: string): boolean {
  const q = rawQuery.trim();
  if (!q) return true;

  const { tokens, expandedTokens } = expandSearchQuery(q);
  if (tokens.length === 0) return true;

  const haystack = buildMarketSearchHaystack(market);
  const searchTokens = expandedTokens.length > 0 ? expandedTokens : tokens;

  return searchTokens.every((token) => haystack.includes(token));
}

/** Filter markets by search with optional debug log (dev-friendly). */
export function applyMarketSearchFilter(
  markets: SeedMarket[],
  rawQuery: string,
  options?: { logMatches?: boolean },
): SeedMarket[] {
  const q = rawQuery.trim();
  if (!q) return markets;

  const matched = markets.filter((m) => marketMatchesSearch(m, q));
  if (options?.logMatches) {
    const { expandedTokens } = expandSearchQuery(q);
    logSearchAliasExpansion(q, expandedTokens, matched.map((m) => m.id));
  }
  return matched;
}
