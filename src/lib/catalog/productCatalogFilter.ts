/**
 * Single product-phase visibility gate for canonical catalog reads.
 * Registry DB stays global (all sports persisted); user-facing surfaces filter here.
 *
 * Server: `backend/src/services/*`, `src/server/services/*`
 * Client UI must NOT re-filter — consume `GET /api/markets` / canonical liquidity only.
 *
 * Env: `PREDICTIO_FOOTBALL_FOCUS=1` (default on). Set `0` to restore multisport product.
 */

export function isFootballSportSlug(sportSlug?: string | null, sport?: string | null): boolean {
  const s = (sportSlug ?? sport ?? "").trim().toLowerCase();
  return s === "football" || s === "soccer";
}

export function isFootballFocusProductPhase(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
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
  return isFootballSportSlug(sportSlug, sport);
}

export function filterCuratedRowsForProductPhase<
  T extends { sport?: string | null; sportSlug?: string | null },
>(rows: readonly T[]): T[] {
  if (!isFootballFocusProductPhase()) return [...rows];
  return rows.filter((r) => isProductCatalogSportAllowed(r.sportSlug, r.sport));
}
