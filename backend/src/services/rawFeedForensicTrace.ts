/**
 * Temporary forensic logging for PREDICTIO_RAW_FEED_MODE — indexer + pipeline only.
 * Remove when feed starvation root cause is confirmed.
 */
import type { RawAzuroGame } from "./azuroCuratorGraphql";
import { isRawFeedMode } from "./emergencyRelaxMode";

export type RawFeedRejectedEvent = {
  id: string;
  title: string;
  rejectionReason: string;
};

function sortParticipants(
  participants: RawAzuroGame["participants"],
): NonNullable<RawAzuroGame["participants"]> {
  const list = Array.isArray(participants) ? participants : [];
  return [...list].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
}

export function rawGameDisplayTitle(g: RawAzuroGame): string {
  const rawTitle = typeof g.title === "string" ? g.title.trim() : "";
  if (rawTitle.length > 0) return rawTitle;
  const sorted = sortParticipants(g.participants);
  const home = String(sorted[0]?.name ?? "").trim() || "TBD";
  const away = String(sorted[1]?.name ?? "").trim() || "TBD";
  return `${home} vs ${away}`;
}

function rawStateBucket(g: RawAzuroGame): "prematch" | "open" | "other" {
  const s = String(g.state ?? "").trim().toLowerCase();
  if (s === "prematch") return "prematch";
  if (s === "open" || s === "") return "open";
  return "other";
}

function kickoffIso(g: RawAzuroGame): string | null {
  const k = parseInt(String(g.startsAt), 10);
  if (!Number.isFinite(k)) return null;
  return new Date(k * 1000).toISOString();
}

function top30ByKickoff(games: RawAzuroGame[]): RawAzuroGame[] {
  return [...games]
    .sort((a, b) => parseInt(String(a.startsAt), 10) - parseInt(String(b.startsAt), 10))
    .slice(0, 30);
}

function inferFeedVerdict(rawCount: number, validCount: number): string {
  if (rawCount < 30) {
    return "il problema nasce PRIMA del DB (feed Azuro indexer quasi vuoto o fetch fallito)";
  }
  const ratio = rawCount > 0 ? validCount / rawCount : 0;
  if (validCount < 30 && ratio < 0.15) {
    return "il problema nasce DOPO il feed (filtri pipeline scartano la maggior parte degli eventi raw)";
  }
  if (validCount >= 100) {
    return "il feed arriva ricco — se l'UI è vuota, il problema è probabilmente DOPO la pipeline (DB sync / API cap / merge frontend)";
  }
  if (validCount >= 30 && ratio >= 0.15) {
    return "il feed e la pipeline minima sono adeguati — indagare layer DB/API/UI";
  }
  return "situazione mista — confrontare RAW_FEED_COUNT vs VALID_COUNT nei log";
}

/** Immediately after `fetchAzuroGames` merge (before curation). */
export function logRawIndexerForensic(games: readonly RawAzuroGame[]): void {
  if (!isRawFeedMode()) return;

  let prematch = 0;
  let openLike = 0;
  for (const g of games) {
    const b = rawStateBucket(g);
    if (b === "prematch") prematch += 1;
    else if (b === "open") openLike += 1;
  }

  const top = top30ByKickoff([...games]);

  console.log(
    JSON.stringify({
      tag: "RAW_FEED_FORENSIC_INDEXER",
      RAW_FEED_MODE: true,
      RAW_FEED_COUNT: games.length,
      RAW_OPEN_COUNT: openLike,
      RAW_PREMATCH_COUNT: prematch,
      TOP_30_EVENT_IDS: top.map((g) => String(g.gameId || g.id || "").trim()),
      TOP_30_EVENT_TITLES: top.map(rawGameDisplayTitle),
      TOP_30_KICKOFFS: top.map((g) => kickoffIso(g)),
      TOP_30_ACTIVE_CONDITIONS_COUNT: top.map((g) =>
        Number(g.activeConditionsCount ?? 0),
      ),
    }),
  );
}

/** After `buildRawFeedCatalogPayload` minimal validation loop. */
export function logRawPipelineForensic(opts: {
  allGames: readonly RawAzuroGame[];
  normalizedCount: number;
  validCount: number;
  rejected: readonly RawFeedRejectedEvent[];
  rejectionAgg: Record<string, number>;
}): void {
  if (!isRawFeedMode()) return;

  const { allGames, normalizedCount, validCount, rejected, rejectionAgg } = opts;

  const topReasons = Object.entries(rejectionAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([reason, count]) => ({ reason, count }));

  const topRaw = top30ByKickoff([...allGames]);

  console.log(
    JSON.stringify({
      tag: "RAW_FEED_FORENSIC_PIPELINE",
      RAW_FEED_MODE: true,
      RAW_FEED_COUNT: allGames.length,
      NORMALIZED_COUNT: normalizedCount,
      VALID_COUNT: validCount,
      RAW_OPEN_COUNT: allGames.filter((g) => rawStateBucket(g) === "open").length,
      RAW_PREMATCH_COUNT: allGames.filter((g) => rawStateBucket(g) === "prematch").length,
      REJECTED_TOTAL: rejected.length,
      TOP_REJECTION_REASONS_AGGREGATE: topReasons,
      TOP_30_EVENT_IDS: topRaw.map((g) => String(g.gameId || g.id || "").trim()),
      TOP_30_EVENT_TITLES: topRaw.map(rawGameDisplayTitle),
      TOP_30_KICKOFFS: topRaw.map((g) => kickoffIso(g)),
      TOP_30_ACTIVE_CONDITIONS_COUNT: topRaw.map((g) =>
        Number(g.activeConditionsCount ?? 0),
      ),
    }),
  );

  const rejectSample = rejected.slice(0, 200);
  for (const ev of rejectSample) {
    console.log(
      JSON.stringify({
        tag: "REJECTED_EVENT",
        id: ev.id,
        title: ev.title,
        rejectionReason: ev.rejectionReason,
      }),
    );
  }
  if (rejected.length > rejectSample.length) {
    console.log(
      JSON.stringify({
        tag: "REJECTED_EVENT_TRUNCATED",
        logged: rejectSample.length,
        omitted: rejected.length - rejectSample.length,
      }),
    );
  }

  const verdict = inferFeedVerdict(allGames.length, validCount);
  console.log(
    JSON.stringify({
      tag: "RAW_FEED_FORENSIC_CONCLUSION",
      RAW_FEED_COUNT: allGames.length,
      NORMALIZED_COUNT: normalizedCount,
      VALID_COUNT: validCount,
      TOP_20_EVENT_IDS: topRaw.slice(0, 20).map((g) => String(g.gameId || g.id || "").trim()),
      TOP_20_EVENT_TITLES: topRaw.slice(0, 20).map(rawGameDisplayTitle),
      TOP_REJECTION_REASONS_AGGREGATE: topReasons,
      CONCLUSIONE_TECNICA: verdict,
    }),
  );
}
