/**
 * Homepage catalog pipeline forensic logs (GET /api/markets → LiveMarkets).
 * Enable: PREDICTIO_HOME_PIPELINE_FORENSIC=true (or PREDICTIO_RAW_FEED_MODE=true).
 */

export function isHomePipelineForensicEnabled(): boolean {
  const home = String(process.env.PREDICTIO_HOME_PIPELINE_FORENSIC ?? "")
    .trim()
    .toLowerCase();
  if (home === "true" || home === "1" || home === "yes") return true;
  const raw = String(process.env.PREDICTIO_RAW_FEED_MODE ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function sportDistributionFromSlugs(sports: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sports) {
    const key = String(s || "unknown").trim().toLowerCase() || "unknown";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

type RowWithSport = {
  gameId?: string;
  id?: string;
  title?: string;
  homeTeam?: string;
  awayTeam?: string;
  sport?: string | null;
  sportSlug?: string | null;
};

function rowId(r: RowWithSport): string {
  return String(r.gameId || r.id || "").trim();
}

function rowTitle(r: RowWithSport): string {
  const t = String(r.title || "").trim();
  if (t) return t;
  const h = String(r.homeTeam || "").trim();
  const a = String(r.awayTeam || "").trim();
  return h && a ? `${h} vs ${a}` : h || a || "unknown";
}

function rowSport(r: RowWithSport): string {
  return String(r.sportSlug ?? r.sport ?? "unknown").trim().toLowerCase() || "unknown";
}

export function logHomeDbForensic(opts: {
  queryLabel: string;
  whereClause: Record<string, unknown>;
  rows: readonly RowWithSport[];
  maxActiveCap?: number;
}): void {
  if (!isHomePipelineForensicEnabled()) return;

  const sorted = [...opts.rows].sort((a, b) => {
    const ta = Date.parse(String((a as { startsAt?: string | Date }).startsAt ?? ""));
    const tb = Date.parse(String((b as { startsAt?: string | Date }).startsAt ?? ""));
    if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;
    return 0;
  });

  const top = sorted.slice(0, 30);

  console.log(
    JSON.stringify({
      tag: "HOME_PIPELINE_DB",
      DB_QUERY: opts.queryLabel,
      DB_WHERE: opts.whereClause,
      DB_OPEN_COUNT: opts.rows.length,
      DB_MAX_ACTIVE_CAP: opts.maxActiveCap ?? null,
      DB_TOP_30_IDS: top.map(rowId),
      DB_TOP_30_TITLES: top.map(rowTitle),
      SPORT_DISTRIBUTION: sportDistributionFromSlugs(sorted.map(rowSport)),
    }),
  );
}

export function logHomeApiForensic(opts: {
  path: "raw-feed-live" | "curated-db" | "protocol-registry-db" | "editorial-db";
  rawFeedCount?: number | null;
  dbOpenCount?: number | null;
  apiResponseCount: number;
  markets: readonly RowWithSport[];
  extra?: Record<string, unknown>;
}): void {
  if (!isHomePipelineForensicEnabled()) return;

  const top = opts.markets.slice(0, 30);

  console.log(
    JSON.stringify({
      tag: "HOME_PIPELINE_API",
      HOMEPAGE_SOURCE: "GET /api/markets",
      API_PATH: opts.path,
      RAW_FEED_COUNT: opts.rawFeedCount ?? null,
      DB_OPEN_COUNT: opts.dbOpenCount ?? null,
      API_RESPONSE_COUNT: opts.apiResponseCount,
      API_RESPONSE_IDS: opts.markets.map(rowId),
      API_RESPONSE_TITLES: opts.markets.map(rowTitle),
      API_TOP_30_IDS: top.map(rowId),
      API_TOP_30_TITLES: top.map(rowTitle),
      SPORT_DISTRIBUTION: sportDistributionFromSlugs(opts.markets.map(rowSport)),
      ...opts.extra,
    }),
  );

  console.log(
    JSON.stringify({
      tag: "HOME_PIPELINE_WATERFALL",
      RAW_FEED_COUNT: opts.rawFeedCount ?? null,
      DB_COUNT: opts.dbOpenCount ?? null,
      API_COUNT: opts.apiResponseCount,
      COLLAPSE_HINT:
        (opts.path === "curated-db" || opts.path === "editorial-db") &&
        (opts.dbOpenCount ?? 0) <= 9
          ? "API legge curated_events — collasso probabile in DB (righe OPEN attive)"
          : opts.path === "protocol-registry-db" && (opts.dbOpenCount ?? 0) < 9
            ? "registry mode ma DB OPEN < 9 — sync boot/API fallito o migration"
            : opts.path === "raw-feed-live"
              ? "API bypass DB list — collasso non dovrebbe essere qui se RAW_FEED_COUNT alto"
              : "verificare layer successivi (frontend slice / intelligence)",
    }),
  );
}
