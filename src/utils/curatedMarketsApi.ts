import { getApiBaseUrl } from "~/lib/predictioApi";
import type { SeedMarket } from "~/data/seedMarkets";
import type { AzuroMarket } from "~/services/azuro";
import { transformAzuroThreeWayOdds } from "~/services/azuro";
import { getFootballSeedMarketsAsAzuro } from "~/utils/footballSeedMarkets";

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
  homeOdds?: number | null;
  drawOdds?: number | null;
  awayOdds?: number | null;
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

  const ho = row.homeOdds;
  const doo = row.drawOdds;
  const ao = row.awayOdds;

  let outcomes: SeedMarket["outcomes"];
  let drawOddsField: string | null | undefined = undefined;

  if (ho != null && doo != null && ao != null && ho > 0 && doo > 0 && ao > 0) {
    const t = transformAzuroThreeWayOdds(String(ho), String(doo), String(ao));
    drawOddsField = doo.toFixed(2);
    outcomes = [
      { id: `${row.gameId}-home`, label: row.homeTeam, price: t.home, volume24h: 0 },
      { id: `${row.gameId}-draw`, label: "Pareggio", price: t.draw, volume24h: 0 },
      { id: `${row.gameId}-away`, label: row.awayTeam, price: t.away, volume24h: 0 },
    ];
  } else if (ho != null && ao != null && ho > 0 && ao > 0) {
    const ih = 1 / ho;
    const ia = 1 / ao;
    const s = ih + ia;
    outcomes = [
      {
        id: `${row.gameId}-home`,
        label: row.homeTeam,
        price: Math.max(0.01, Math.min(0.99, ih / s)),
        volume24h: 0,
      },
      {
        id: `${row.gameId}-away`,
        label: row.awayTeam,
        price: Math.max(0.01, Math.min(0.99, ia / s)),
        volume24h: 0,
      },
    ];
    drawOddsField = null;
  } else {
    outcomes = [
      { id: `${row.gameId}-home`, label: row.homeTeam, price: 0.5, volume24h: 0 },
      { id: `${row.gameId}-away`, label: row.awayTeam, price: 0.5, volume24h: 0 },
    ];
  }

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
    outcomes,
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
    drawOdds: drawOddsField,
  };
}

export async function fetchCuratedMarketsFromApi(): Promise<{
  markets: AzuroMarket[];
  total: number;
  source: "curated-api" | "fallback";
}> {
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
    // Backend OK but no curated rows / DB empty — same as fetch failure: show demo seeds.
    if (markets.length === 0) {
      const fallback = getFootballSeedMarketsAsAzuro();
      return {
        markets: fallback,
        total: fallback.length,
        source: "fallback",
      };
    }
    return {
      markets,
      total: data.total ?? markets.length,
      source: "curated-api",
    };
  } catch {
    const fallback = getFootballSeedMarketsAsAzuro();
    return {
      markets: fallback,
      total: fallback.length,
      source: "fallback",
    };
  }
}
