/**
 * Widening switches for catalog starvation — see `eventCurationPipeline` + `editorialPremiumFirewall`.
 *
 * - `PREDICTIO_EMERGENCY_RELAX` — disables strict premium whitelist + expands gates (legacy name).
 * - `PREDICTIO_EMERGENCY_INVENTORY_MODE` — **full funnel bypass**: minimal tradable checks only + forced min book.
 */

export function isEmergencyRelaxMode(): boolean {
  const v = String(process.env.PREDICTIO_EMERGENCY_RELAX ?? "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Full inventory recovery: raw → minimal validate → rank → cap (no editorial / appeal / Europe tier gates). */
export function isEmergencyInventoryMode(): boolean {
  const v = String(process.env.PREDICTIO_EMERGENCY_INVENTORY_MODE ?? "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function isEmergencyCatalogBypass(): boolean {
  return isEmergencyInventoryMode() || isEmergencyRelaxMode();
}

/** Default 168h — combined with `curationLookaheadDays()` via `Math.max` in pipeline (never narrows below index horizon). */
export function emergencyInventoryMaxWindowHours(): number {
  const n = Number(process.env.PREDICTIO_EMERGENCY_INVENTORY_MAX_HOURS ?? "168");
  return Number.isFinite(n) && n >= 6 ? Math.floor(n) : 168;
}

export function emergencyMinMarkets(): number {
  const n = Number(process.env.PREDICTIO_EMERGENCY_MIN_MARKETS ?? "9");
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 9;
}

/** Seconds to subtract from "now" when fetching/indexing (clock skew / boundary kickoffs). */
export function emergencyFetchNowSkewSec(): number {
  return isEmergencyCatalogBypass() ? 600 : 0;
}

/** Lookahead window in days — 90d when any emergency bypass is on. */
export function curationLookaheadDays(): number {
  return isEmergencyCatalogBypass() ? 90 : 60;
}

export function emergencyInventoryWindowEndSec(wallSec: number): number {
  const horizonDaysSec = curationLookaheadDays() * 86400;
  const minHoursSec = emergencyInventoryMaxWindowHours() * 3600;
  return wallSec + Math.max(minHoursSec, horizonDaysSec);
}

/**
 * Take the first `minimum` unique gameIds from an already-sorted candidate list (best-first).
 */
export function guaranteedMinimumInventory<T extends { raw: { gameId?: string } }>(
  sortedCandidates: readonly T[],
  minimum: number = emergencyMinMarkets(),
): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const it of sortedCandidates) {
    if (out.length >= minimum) break;
    const gid = String(it.raw.gameId || "").trim();
    if (!gid || seen.has(gid)) continue;
    seen.add(gid);
    out.push(it);
  }
  return out;
}
