/**
 * Azuro GraphQL for admin event curation (football, next 14 days).
 * Uses AZURO_CURATOR_GRAPHQL_URL or AZURO_GRAPHQL_URL — must match the chain used by the app indexer.
 */

const DEFAULT_GRAPHQL =
  process.env.AZURO_CURATOR_GRAPHQL_URL?.trim() ||
  process.env.AZURO_GRAPHQL_URL?.trim() ||
  "https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-base-v3";

const FETCH_TIMEOUT_MS = 15_000;

export type NormalizedCuratorGame = {
  gameId: string;
  title: string;
  startsAt: string;
  startsAtUnix: number;
  leagueName: string;
  country: string;
  homeTeam: string;
  awayTeam: string;
  homeImage?: string | null;
  awayImage?: string | null;
  status: string;
};

type MappedCuratorGame = NormalizedCuratorGame & { sportName: string };

const CURATOR_GAMES_QUERY = `
  query CuratorGames($first: Int!, $where: Game_filter!) {
    games(
      first: $first
      where: $where
      orderBy: startsAt
      orderDirection: asc
    ) {
      id
      gameId
      title
      startsAt
      league {
        name
        country {
          name
        }
      }
      participants {
        name
        image
      }
      status
      sport {
        name
      }
    }
  }
`;

const SINGLE_GAME_QUERY = `
  query CuratorGame($gameId: String!) {
    games(where: { gameId: $gameId }) {
      id
      gameId
      title
      startsAt
      league {
        name
        country {
          name
        }
      }
      participants {
        name
        image
      }
      status
      sport {
        name
      }
    }
  }
`;

function graphqlEndpoint(): string {
  return DEFAULT_GRAPHQL;
}

async function graphqlFetch(body: object): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(graphqlEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

function mapGame(raw: Record<string, unknown>): MappedCuratorGame | null {
  const gameId = typeof raw.gameId === "string" ? raw.gameId : "";
  if (!gameId) return null;

  const startsRaw = raw.startsAt;
  const startsUnix =
    typeof startsRaw === "string" ? parseInt(startsRaw, 10) : Number(startsRaw);
  if (!Number.isFinite(startsUnix)) return null;

  const league = raw.league as Record<string, unknown> | undefined;
  const countryObj = league?.country as Record<string, unknown> | undefined;
  const leagueName = typeof league?.name === "string" ? league.name : "";
  const country = typeof countryObj?.name === "string" ? countryObj.name : "";

  const participants = Array.isArray(raw.participants)
    ? (raw.participants as Array<{ name?: string; image?: string | null }>)
    : [];
  const homeTeam = participants[0]?.name?.trim() || "Home";
  const awayTeam = participants[1]?.name?.trim() || "Away";
  const homeImage = participants[0]?.image ?? null;
  const awayImage = participants[1]?.image ?? null;

  const sport = raw.sport as { name?: string } | undefined;
  const sportName = sport?.name?.toLowerCase() || "";

  const titleRaw = typeof raw.title === "string" ? raw.title.trim() : "";
  const title =
    titleRaw ||
    `${homeTeam} vs ${awayTeam}`;

  const status = String(raw.status ?? "");

  const startsAt = new Date(startsUnix * 1000).toISOString();

  return {
    gameId,
    title,
    startsAt,
    startsAtUnix: startsUnix,
    leagueName,
    country,
    homeTeam,
    awayTeam,
    homeImage,
    awayImage,
    status,
    sportName,
  };
}

function isFootballishSport(name: string): boolean {
  const s = name.toLowerCase();
  return s.includes("football") || s.includes("soccer") || s === "";
}

/** Football games with kickoff in (now, now+14d], status Created, ordered by startsAt. */
export async function fetchFootballGamesNext14Days(): Promise<NormalizedCuratorGame[]> {
  const nowSec = Math.floor(Date.now() / 1000);
  const endSec = nowSec + 14 * 24 * 3600;

  const whereVariants: Record<string, unknown>[] = [
    {
      sport_: { name: "Football" },
      startsAt_gt: nowSec.toString(),
      startsAt_lt: endSec.toString(),
      status: "Created",
    },
    {
      sport_: { name: "Football" },
      startsAt_gt: nowSec.toString(),
      startsAt_lt: endSec.toString(),
      status_in: ["Created"],
    },
    {
      startsAt_gt: nowSec.toString(),
      startsAt_lt: endSec.toString(),
      status_in: ["Created", "Paused"],
    },
  ];

  for (const where of whereVariants) {
    try {
      const res = await graphqlFetch({
        query: CURATOR_GAMES_QUERY,
        variables: { first: 100, where },
      });
      const text = await res.text();
      const json = JSON.parse(text) as {
        errors?: unknown;
        data?: { games?: Record<string, unknown>[] };
      };

      if (!res.ok) {
        console.warn("[azuroCurator] HTTP", res.status, text.slice(0, 200));
        continue;
      }
      if (json.errors) {
        console.warn("[azuroCurator] GraphQL errors:", JSON.stringify(json.errors).slice(0, 400));
        continue;
      }

      const games = json.data?.games || [];
      const mapped: NormalizedCuratorGame[] = [];
      for (const g of games) {
        const row = mapGame(g as Record<string, unknown>);
        if (!row) continue;
        if (!isFootballishSport(row.sportName)) continue;
        if (row.startsAtUnix <= nowSec) continue;
        const { sportName: _s, ...rest } = row;
        void _s;
        mapped.push(rest);
      }

      mapped.sort((a, b) => a.startsAtUnix - b.startsAtUnix);
      if (mapped.length > 0) return mapped;
    } catch (e) {
      console.warn("[azuroCurator] fetch attempt failed:", e instanceof Error ? e.message : e);
    }
  }

  return [];
}

export async function fetchGameByGameId(gameId: string): Promise<NormalizedCuratorGame | null> {
  try {
    const res = await graphqlFetch({
      query: SINGLE_GAME_QUERY,
      variables: { gameId },
    });
    const text = await res.text();
    const json = JSON.parse(text) as {
      errors?: unknown;
      data?: { games?: Record<string, unknown>[] };
    };

    if (!res.ok || json.errors) return null;
    const raw = json.data?.games?.[0];
    if (!raw) return null;
    const mapped = mapGame(raw as Record<string, unknown>);
    if (!mapped) return null;
    const { sportName: _sn, ...rest } = mapped;
    void _sn;
    return rest;
  } catch {
    return null;
  }
}
