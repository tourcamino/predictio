/**
 * PR21 — Azuro official Backend REST API (Market Manager).
 * Replaces deprecated data-feed subgraph for prematch/live inventory.
 * @see https://gem.azuro.org/hub/apps/APIs/backend
 */

const REST_BASE =
  process.env.AZURO_REST_API_BASE?.trim() ||
  "https://api.onchainfeed.org/api/v1/public/market-manager";

export const AZURO_REST_ENVIRONMENT =
  process.env.AZURO_ENVIRONMENT?.trim() || "PolygonUSDT";

export function isAzuroRestFeedEnabled(): boolean {
  return process.env.AZURO_USE_REST_FEED !== "false";
}

type RestParticipant = { name: string; image?: string | null };
type RestGame = {
  id: string;
  gameId: string;
  title: string;
  startsAt: string;
  state: string;
  sport: { sportId?: string; slug: string; name: string };
  league: { slug: string; name: string };
  country: { slug: string; name: string };
  participants: RestParticipant[];
};

type RestCondition = {
  conditionId: string;
  state: string;
  outcomes: Array<{ outcomeId: string; odds: string }>;
  game: { gameId: string };
};

type GamesByFiltersResponse = {
  games: RestGame[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

type ConditionsByGameIdsResponse = {
  conditions: RestCondition[];
};

async function restGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const q = new URLSearchParams(params);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${REST_BASE}${path}?${q}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const json = (await res.json()) as T & { message?: unknown; error?: string };
    if (!res.ok) {
      throw new Error(
        `REST ${path} HTTP ${res.status}: ${JSON.stringify(json.message ?? json.error).slice(0, 200)}`,
      );
    }
    return json;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function restPost<T>(path: string, body: object): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${REST_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await res.json()) as T & { message?: unknown; error?: string };
    if (!res.ok) {
      throw new Error(
        `REST POST ${path} HTTP ${res.status}: ${JSON.stringify(json.message ?? json.error).slice(0, 200)}`,
      );
    }
    return json;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchConditionsMap(gameIds: string[]): Promise<Map<string, RestCondition[]>> {
  const map = new Map<string, RestCondition[]>();
  const CHUNK = 40;
  for (let i = 0; i < gameIds.length; i += CHUNK) {
    const chunk = gameIds.slice(i, i + CHUNK);
    const data = await restPost<ConditionsByGameIdsResponse>("/conditions-by-game-ids", {
      environment: AZURO_REST_ENVIRONMENT,
      gameIds: chunk,
    });
    for (const c of data.conditions ?? []) {
      const gid = String(c.game?.gameId ?? "").trim();
      if (!gid) continue;
      const list = map.get(gid) ?? [];
      list.push(c);
      map.set(gid, list);
    }
  }
  return map;
}

type RestMappedGame = {
  id?: string;
  gameId?: string;
  title?: string;
  startsAt?: string | number;
  state?: string;
  sport?: { name?: string; slug?: string };
  league?: { name?: string; slug?: string; country?: { name?: string } };
  participants?: Array<{ name?: string; image?: string | null; sortOrder?: number }>;
  activeConditionsCount?: number;
  conditions?: Array<{
    state?: string;
    outcomes?: Array<{ currentOdds?: string | null }>;
  }>;
};

function mapRestGame(g: RestGame, conditions: RestCondition[]): RestMappedGame {
  const active = conditions.filter((c) => c.state === "Active");
  return {
    id: g.id,
    gameId: g.gameId,
    title: g.title,
    startsAt: g.startsAt,
    state: g.state,
    sport: { name: g.sport.name, slug: g.sport.slug },
    league: {
      name: g.league.name,
      slug: g.league.slug,
      country: { name: g.country.name },
    },
    participants: g.participants.map((p, sortOrder) => ({
      name: p.name,
      image: p.image ?? null,
      sortOrder,
    })),
    activeConditionsCount: active.length,
    conditions: active.map((c) => ({
      state: c.state,
      outcomes: c.outcomes.map((o) => ({ currentOdds: o.odds })),
    })),
  };
}

export async function fetchAzuroRestGamesByState(
  gameState: "Prematch" | "Live",
  opts?: { maxPages?: number; perPage?: number },
): Promise<RestMappedGame[]> {
  const perPage = opts?.perPage ?? 100;
  const maxPages = opts?.maxPages ?? 15;
  const allGames: RestGame[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const data = await restGet<GamesByFiltersResponse>("/games-by-filters", {
      environment: AZURO_REST_ENVIRONMENT,
      gameState,
      page: String(page),
      perPage: String(perPage),
      orderBy: "startsAt",
      orderDirection: gameState === "Live" ? "desc" : "asc",
    });
    allGames.push(...(data.games ?? []));
    if (page >= (data.totalPages ?? 1)) break;
  }

  const gameIds = [...new Set(allGames.map((g) => g.gameId).filter(Boolean))];
  const condMap = await fetchConditionsMap(gameIds);

  const merged: RestMappedGame[] = [];
  const seen = new Set<string>();
  for (const g of allGames) {
    if (!g.gameId || seen.has(g.gameId)) continue;
    seen.add(g.gameId);
    merged.push(mapRestGame(g, condMap.get(g.gameId) ?? []));
  }

  console.log(
    JSON.stringify({
      tag: "azuro_rest_fetch",
      gameState,
      environment: AZURO_REST_ENVIRONMENT,
      rawCount: merged.length,
      withActiveConditions: merged.filter((g) => (g.activeConditionsCount ?? 0) > 0).length,
    }),
  );

  return merged;
}
