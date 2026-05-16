/**
 * Product-phase catalog visibility — registry DB stays global; user-facing surfaces
 * (GET /api/markets, canonical LP graph) share this filter when football focus is on.
 *
 * Keep in sync with `src/lib/catalog/productCatalogFilter.ts` (Vinxi / tRPC path).
 */
import { isFootballSportSlug } from "./canonicalSportTaxonomy";

export function isFootballFocusProductPhase(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw =
    env.PREDICTIO_FOOTBALL_FOCUS ??
    env.VITE_PREDICTIO_FOOTBALL_FOCUS ??
    "1";
  const v = String(raw).trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "off" && v !== "no";
}

export function isProductCatalogSportAllowed(
  sportSlug?: string | null,
  sport?: string | null,
): boolean {
  if (!isFootballFocusProductPhase()) return true;
  return isFootballSportSlug(sportSlug) || isFootballSportSlug(sport);
}

export function filterCuratedRowsForProductPhase<
  T extends { sport?: string | null; sportSlug?: string | null },
>(rows: readonly T[]): T[] {
  if (!isFootballFocusProductPhase()) return [...rows];
  return rows.filter((r) => isProductCatalogSportAllowed(r.sportSlug, r.sport));
}

export { isFootballSportSlug };
