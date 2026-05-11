const AZURO_FEED_URL = process.env.AZURO_DATA_FEED_URL;

/**
 * Legacy The Graph "hosted service" URLs are HTML pages, not GraphQL endpoints.
 * Map `thegraph.com/hosted-service/subgraph/owner/name` → `api.thegraph.com/subgraphs/name/owner/name`.
 */
export function normalizeAzuroGraphqlUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return u;
  try {
    const parsed = new URL(u);
    const m = parsed.pathname.match(/\/hosted-service\/subgraph\/([^/]+)\/([^/]+)\/?$/);
    if (m && parsed.hostname === "thegraph.com") {
      return `https://api.thegraph.com/subgraphs/name/${m[1]}/${m[2]}`;
    }
  } catch {
    // keep raw
  }
  return u;
}

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

export type CuratorFetchDiagnostics = {
  graphqlUrl: string;
  /** Total `games` rows returned by Azuro before JS filters */
  indexerRawCount: number;
  /** Football games after JS filters in 14d window */
  footballInWindowCount: number;
  /** True if at least one GraphQL round-trip succeeded without errors */
  querySucceeded: boolean;
  lastError?: string;
};

export type RawAzuroGame = {
  id?: string;
  gameId?: string;
  title?: string;
  startsAt?: string | number;
  state?: string;
  sport?: { name?: string; slug?: string };
  league?: { name?: string; country?: { name?: string } };
  participants?: Array<{ name?: string; image?: string | null; sortOrder?: number }>;
  activeConditionsCount?: number;
  conditions?: Array<{
    state?: string;
    outcomes?: Array<{ currentOdds?: string | null }>;
  }>;
};

export async function fetchAzuroGames(): Promise<RawAzuroGame[]> {
  if (!AZURO_FEED_URL) {
    throw new Error("AZURO_DATA_FEED_URL is not set");
  }

  const query = `
    query Games {
      games(
        first: 1000
        where: {
          state: Prematch
          activeConditionsCount_gt: 0
        }
        orderBy: startsAt
        orderDirection: asc
      ) {
        id
        gameId
        title
        startsAt
        state
        sport {
          name
          slug
        }
        league {
          name
          country {
            name
          }
        }
        participants {
          name
          image
          sortOrder
        }
        activeConditionsCount
        conditions(where: { state: Active }) {
          state
          outcomes {
            currentOdds
          }
        }
      }
    }
  `;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(AZURO_FEED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const json = (await response.json()) as {
    data?: { games?: RawAzuroGame[] };
    errors?: unknown;
  };

   
  console.log("AZURO RESPONSE STATUS:", response.status);
   
  console.log("AZURO RAW:", JSON.stringify(json).substring(0, 500));

  if ((json as any).errors) {
    throw new Error(JSON.stringify((json as any).errors));
  }

  return json.data?.games || [];
}

function normalizeGame(raw: RawAzuroGame): NormalizedCuratorGame | null {
  const gameId = typeof raw.gameId === "string" ? raw.gameId.trim() : "";
  if (!gameId) return null;

  const startsUnix =
    typeof raw.startsAt === "string" ? parseInt(raw.startsAt, 10) : Number(raw.startsAt);
  if (!Number.isFinite(startsUnix)) return null;

  const leagueName = raw.league?.name?.trim() || "";
  const country = raw.league?.country?.name?.trim() || "";

  const participants = Array.isArray(raw.participants) ? raw.participants : [];
  const sorted = [...participants].sort(
    (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
  );
  const homeTeam = sorted[0]?.name?.trim() || "Home";
  const awayTeam = sorted[1]?.name?.trim() || "Away";
  const homeImage = sorted[0]?.image ?? null;
  const awayImage = sorted[1]?.image ?? null;

  const title =
    typeof raw.title === "string" && raw.title.trim().length > 0
      ? raw.title.trim()
      : `${homeTeam} vs ${awayTeam}`;

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
    status: String(raw.state || ""),
  };
}

export async function fetchFootballGamesNext14Days(): Promise<{
  games: NormalizedCuratorGame[];
  diagnostics: CuratorFetchDiagnostics;
}> {
  const graphqlUrl = AZURO_FEED_URL || "";

  let querySucceeded = false;
  let lastError: string | undefined;

  try {
    const allGames = await fetchAzuroGames();
    querySucceeded = true;

    // ── 1. LOG per vedere nomi esatti leghe ──
    const allLeagues = [
      ...new Set(
        allGames.map(
          (g) => `${g.sport?.name} | ${g.league?.country?.name} | ${g.league?.name}`,
        ),
      ),
    ].sort();
     
    console.log("LEGHE DISPONIBILI:\n" + allLeagues.join("\n"));

    // ── 2. Paesi europei whitelist ──
    const EUROPEAN_COUNTRIES = [
      "england",
      "italy",
      "spain",
      "germany",
      "france",
      "portugal",
      "netherlands",
      "belgium",
      "turkey",
      "scotland",
      "austria",
      "ukraine",
      "russia",
      "switzerland",
      "greece",
      "denmark",
      "sweden",
      "norway",
      "czech republic",
      "croatia",
      "serbia",
      "europe", // per Champions, Europa League, Conference
    ];

    // ── 3. Leghe prioritarie (mostrate per prime) ──
    const PRIORITY_LEAGUES = [
      "champions league",
      "europa league",
      "conference league",
      "serie a",
      "premier league",
      "la liga",
      "bundesliga",
      "ligue 1",
      "primeira liga",
      "eredivisie",
      "super lig",
    ];

    // ── 4. Filtra calcio europeo ──
    const now = Math.floor(Date.now() / 1000);
    const fifteenDays = now + 30 * 24 * 60 * 60;

    const europeanFootball = allGames.filter((game) => {
      // solo calcio
      if (game.sport?.slug !== "football") return false;

      // solo partite future nei prossimi 15 giorni
      const kickoff = parseInt(String(game.startsAt), 10);
      if (!Number.isFinite(kickoff) || kickoff <= now || kickoff > fifteenDays) return false;

      // solo paesi europei
      const country = (game.league?.country?.name || "").toLowerCase();
      return EUROPEAN_COUNTRIES.some((c) => country.includes(c));
    });

    // ── 5. Ordina: leghe prioritarie prima, poi per data ──
    europeanFootball.sort((a, b) => {
      const leagueA = (a.league?.name || "").toLowerCase();
      const leagueB = (b.league?.name || "").toLowerCase();

      const prioA = PRIORITY_LEAGUES.findIndex((l) => leagueA.includes(l));
      const prioB = PRIORITY_LEAGUES.findIndex((l) => leagueB.includes(l));

      const rankA = prioA === -1 ? 999 : prioA;
      const rankB = prioB === -1 ? 999 : prioB;

      if (rankA !== rankB) return rankA - rankB;
      return parseInt(String(a.startsAt), 10) - parseInt(String(b.startsAt), 10);
    });

     
    console.log("Totale giochi Azuro:", allGames.length);
     
    console.log("Calcio europeo 15gg:", europeanFootball.length);
     
    console.log("Prime 20 partite:");
    europeanFootball.slice(0, 20).forEach((g) =>
       
      console.log(
        `  ${g.participants?.[0]?.name} vs ${g.participants?.[1]?.name}`,
        `| ${g.league?.name}`,
        `| ${new Date(parseInt(String(g.startsAt), 10) * 1000).toLocaleDateString("it-IT")}`,
      ),
    );

    const normalized: NormalizedCuratorGame[] = [];
    for (const g of europeanFootball) {
      const mapped = normalizeGame(g);
      if (mapped) normalized.push(mapped);
    }

    normalized.sort((a, b) => a.startsAtUnix - b.startsAtUnix);

    return {
      games: normalized,
      diagnostics: {
        graphqlUrl,
        indexerRawCount: allGames.length,
        footballInWindowCount: normalized.length,
        querySucceeded: true,
      },
    };
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
     
    console.warn("[azuroCurator] fetch failed:", lastError);
    return {
      games: [],
      diagnostics: {
        graphqlUrl,
        indexerRawCount: 0,
        footballInWindowCount: 0,
        querySucceeded,
        lastError,
      },
    };
  }
}

function parseDecimalOdd(s: unknown): number | null {
  const n = parseFloat(String(s ?? "").trim());
  return Number.isFinite(n) && n > 1 ? n : null;
}

/** European decimal odds from first Active condition (V3: outcomes[0] home, [1] draw, [2] away). */
export function extract1x2DecimalOddsFromRawGame(g: RawAzuroGame): {
  homeOdds: number | null;
  drawOdds: number | null;
  awayOdds: number | null;
} {
  const conds = Array.isArray(g.conditions) ? g.conditions : [];
  const outs = conds[0]?.outcomes;
  if (!Array.isArray(outs) || outs.length < 2) {
    return { homeOdds: null, drawOdds: null, awayOdds: null };
  }
  if (outs.length >= 3) {
    return {
      homeOdds: parseDecimalOdd(outs[0]?.currentOdds),
      drawOdds: parseDecimalOdd(outs[1]?.currentOdds),
      awayOdds: parseDecimalOdd(outs[2]?.currentOdds),
    };
  }
  return {
    homeOdds: parseDecimalOdd(outs[0]?.currentOdds),
    drawOdds: null,
    awayOdds: parseDecimalOdd(outs[1]?.currentOdds),
  };
}

/** Single-game 1X2 odds (lighter than loading the full games list). */
export async function fetchAzuro1x2DecimalOddsByGameId(
  gameId: string,
): Promise<{ homeOdds: number | null; drawOdds: number | null; awayOdds: number | null } | null> {
  if (!AZURO_FEED_URL) return null;
  const query = `
    query Odds($gameId: String!) {
      games(where: { gameId: $gameId }, first: 1) {
        conditions(where: { state: Active }, first: 1) {
          outcomes {
            currentOdds
          }
        }
      }
    }
  `;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(AZURO_FEED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { gameId } }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  const json = (await response.json()) as {
    data?: { games?: Array<{ conditions?: RawAzuroGame["conditions"] }> };
    errors?: unknown;
  };
  if ((json as any).errors) return null;
  const stub: RawAzuroGame = { conditions: json.data?.games?.[0]?.conditions };
  const odds = extract1x2DecimalOddsFromRawGame(stub);
  if (!odds.homeOdds && !odds.drawOdds && !odds.awayOdds) return null;
  return odds;
}

export async function fetchGameByGameId(gameId: string): Promise<NormalizedCuratorGame | null> {
  try {
    const allGames = await fetchAzuroGames();
    const found = allGames.find((g) => String(g.gameId || "") === gameId);
    if (!found) return null;
    return normalizeGame(found);
  } catch {
    return null;
  }
}
