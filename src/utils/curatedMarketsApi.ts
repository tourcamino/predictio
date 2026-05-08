import { getApiBaseUrl } from "~/lib/predictioApi";
import { SEED_MARKETS, type SeedMarket } from "~/data/seedMarkets";
import type { AzuroMarket } from "~/services/azuro";

/** Row shape from Express `GET /api/markets` (see `backend/src/routes/adminCuration.ts`). */
export type CuratedMarketApiRow = {
  id: string;
  gameId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  homeImage: string | null;
  awayImage: string | null;
  leagueName: string;
  country: string;
  startsAt: string;
  lockedAt: string;
  status: string;
  result: string | null;
  timeToLock: number;
  importanceScore: number;
  autoPublish: boolean;
};

function slugifyCompetition(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "league";
}

function deriveSeedStatus(row: CuratedMarketApiRow): SeedMarket["status"] {
  const st = String(row.status || "OPEN").toUpperCase();
  if (st === "RESOLVED") return "resolved";
  if (st === "LOCKED") return "locked";
  const starts = new Date(row.startsAt).getTime();
  const locked = new Date(row.lockedAt).getTime();
  const now = Date.now();
  if (now >= locked) return "live";
  if (now >= starts) return "live";
  const hoursToLock = (locked - now) / (1000 * 60 * 60);
  if (hoursToLock > 0 && hoursToLock <= 24) return "ending-soon";
  return "upcoming";
}

export function curatedApiRowToAzuroMarket(row: CuratedMarketApiRow): AzuroMarket {
  const startsAt = row.startsAt;
  const endsAt = row.lockedAt;
  const slug = slugifyCompetition(row.leagueName);

  return {
    id: row.id,
    question: `${row.homeTeam} vs ${row.awayTeam}`,
    sport: "football",
    sportEmoji: "⚽",
    competition: row.leagueName,
    competitionSlug: slug,
    event: {
      name: row.title || `${row.homeTeam} vs ${row.awayTeam}`,
      slug: `${slug}-${row.gameId}`.slice(0, 80),
      startsAt,
      lockedAt: row.lockedAt,
      teams: [row.homeTeam, row.awayTeam],
      location: row.country,
    },
    outcomes: [
      {
        id: `${row.gameId}-home`,
        label: row.homeTeam,
        price: 0.5,
        volume24h: 0,
      },
      {
        id: `${row.gameId}-away`,
        label: row.awayTeam,
        price: 0.5,
        volume24h: 0,
      },
    ],
    volume24h: 25_000,
    liquidity: 12_000,
    traders: 150,
    status: deriveSeedStatus(row),
    createdAt: startsAt,
    creator: "predictio",
    resolutionSources: [],
    endsAt,
    isFeatured: false,
    azuroGameId: row.gameId,
    azuroStatus: row.status,
    azuroResult: row.result ?? undefined,
    importanceScore: row.importanceScore,
  };
}

export async function fetchCuratedMarketsFromApi(): Promise<{
  markets: AzuroMarket[];
  total: number;
  source: "curated-api" | "seed-fallback";
}> {
  // Local dev fast-path: when API base is same-origin, requests are proxied to Express.
  // If Express/DB isn't running, that proxy can hang; seed markets keep the UI usable.
  if (typeof window !== "undefined") {
    const base = getApiBaseUrl().replace(/\/$/, "");
    const origin = window.location.origin.replace(/\/$/, "");
    if (base === origin) {
      return {
        markets: SEED_MARKETS as unknown as AzuroMarket[],
        total: SEED_MARKETS.length,
        source: "seed-fallback",
      };
    }
  }

  try {
    const base = getApiBaseUrl().replace(/\/$/, "");
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 6_000);
    const res = await fetch(`${base}/api/markets`, { signal: ac.signal });
    clearTimeout(t);
    if (!res.ok) {
      throw new Error(`GET /api/markets failed (${res.status})`);
    }
    const data = (await res.json()) as {
      markets: CuratedMarketApiRow[];
      total: number;
    };
    const markets = (data.markets ?? []).map(curatedApiRowToAzuroMarket);
    // If backend is up but DB is empty/offline, keep the page usable in local dev.
    if (markets.length === 0) {
      return {
        markets: SEED_MARKETS as unknown as AzuroMarket[],
        total: SEED_MARKETS.length,
        source: "seed-fallback",
      };
    }
    return {
      markets,
      total: data.total ?? markets.length,
      source: "curated-api",
    };
  } catch {
    return {
      markets: SEED_MARKETS as unknown as AzuroMarket[],
      total: SEED_MARKETS.length,
      source: "seed-fallback",
    };
  }
}
