/**
 * Widening switches for catalog starvation — see `eventCurationPipeline` + `editorialPremiumFirewall`.
 *
 * - `PREDICTIO_EMERGENCY_RELAX` — disables strict premium whitelist + expands gates (legacy name).
 * - `PREDICTIO_EMERGENCY_INVENTORY_MODE` — **full funnel bypass**: minimal tradable checks only + forced min book.
 * - `PREDICTIO_RAW_FEED_MODE` — **debug / survival**: Azuro → minimal validation only → full list (no editorial,
 *   interest, Europe tier, premium, orchestrator). Intended to verify indexer depth; not final product behavior.
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

/** Raw Azuro ingestion — bypasses all curated / editorial / interest / premium layers. */
export function isRawFeedMode(): boolean {
  const v = String(process.env.PREDICTIO_RAW_FEED_MODE ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Pages × pageSize (250) — indexer round-trips. Default 40 ≈ 10k rows max merged. */
export function rawFeedMaxPages(): number {
  const n = Number(process.env.PREDICTIO_RAW_FEED_MAX_PAGES ?? "40");
  return Number.isFinite(n) && n >= 1 ? Math.min(120, Math.floor(n)) : 40;
}

/** Forward window from wall clock (seconds). Default 90d. */
export function rawFeedWindowEndSec(wallSec: number): number {
  const days = Number(process.env.PREDICTIO_RAW_FEED_LOOKAHEAD_DAYS ?? "90");
  const d = Number.isFinite(days) && days >= 1 ? Math.min(365, Math.floor(days)) : 90;
  return wallSec + d * 86400;
}

/** Max games returned by `buildEuropeanCurationGamesPayload` in raw mode (after minimal filter). */
export function rawFeedPipelineMaxGames(): number {
  const n = Number(process.env.PREDICTIO_RAW_FEED_PIPELINE_MAX ?? "3000");
  return Number.isFinite(n) && n >= 50 ? Math.min(20000, Math.floor(n)) : 3000;
}

/** Max JSON rows returned by `GET /api/markets` in raw mode (full payload can be huge). */
export function rawFeedApiResponseCap(): number {
  const n = Number(process.env.PREDICTIO_RAW_FEED_API_CAP ?? "2500");
  return Number.isFinite(n) && n >= 50 ? Math.min(10000, Math.floor(n)) : 2500;
}

/** Max rows written to `curated_events` on raw DB sync (boot / throttled GET). */
export function rawFeedDbSyncCap(): number {
  const n = Number(process.env.PREDICTIO_RAW_FEED_DB_CAP ?? "800");
  return Number.isFinite(n) && n >= 10 ? Math.min(5000, Math.floor(n)) : 800;
}

export function isEmergencyCatalogBypass(): boolean {
  return isRawFeedMode() || isEmergencyInventoryMode() || isEmergencyRelaxMode();
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
