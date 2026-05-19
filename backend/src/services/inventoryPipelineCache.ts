/**
 * PR24 — In-memory cache for Azuro pipeline payload (avoid 16s+ rebuild per browser request).
 */
import {
  buildEuropeanCurationGamesPayload,
  type CurationGamePayload,
} from "./eventCurationPipeline";

type PipelineCacheEntry = {
  games: CurationGamePayload[];
  diagnostics: Awaited<ReturnType<typeof buildEuropeanCurationGamesPayload>>["diagnostics"];
  builtAtMs: number;
  buildMs: number;
};

let cache: PipelineCacheEntry | null = null;
let inflight: Promise<PipelineCacheEntry> | null = null;

function cacheTtlMs(): number {
  const n = Number(process.env.PREDICTIO_INVENTORY_CACHE_TTL_MS ?? "90000");
  return Number.isFinite(n) && n > 10_000 ? n : 90_000;
}

export function invalidateInventoryPipelineCache(): void {
  cache = null;
}

export async function getInventoryPipelinePayload(force = false): Promise<PipelineCacheEntry> {
  const now = Date.now();
  if (!force && cache && now - cache.builtAtMs < cacheTtlMs()) {
    console.log(
      JSON.stringify({
        tag: "INVENTORY_PIPELINE_CACHE_HIT",
        ageMs: now - cache.builtAtMs,
        PIPELINE_COUNT: cache.games.length,
        buildMs: cache.buildMs,
      }),
    );
    return cache;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    const started = Date.now();
    const { games, diagnostics } = await buildEuropeanCurationGamesPayload(new Set());
    const entry: PipelineCacheEntry = {
      games,
      diagnostics,
      builtAtMs: Date.now(),
      buildMs: Date.now() - started,
    };
    cache = entry;
    console.log(
      JSON.stringify({
        tag: "INVENTORY_PIPELINE_CACHE_MISS",
        PIPELINE_COUNT: games.length,
        RAW_FEED_COUNT: diagnostics.totalFromAzuro,
        buildMs: entry.buildMs,
        ttlMs: cacheTtlMs(),
      }),
    );
    return entry;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
