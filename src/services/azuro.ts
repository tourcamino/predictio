import { SeedMarket } from "~/data/seedMarkets";
import { MAX_FOOTBALL_MARKETS } from "~/constants/azuro";
import { env } from "~/server/env";
import {
  classifyAzuroGameForSettlement,
  logSettlementDiagnostic,
} from "~/lib/settlement/settlementDiagnostics";
import {
  mapWonOutcomeToHomeAway,
  pickMoneylineCondition,
} from "~/lib/settlement/azuroConditionSelection";

export {
  hoursUntilStartMarket,
  pickTieredFootballMarkets,
} from "~/utils/footballSeedMarkets";

export { MAX_FOOTBALL_MARKETS };

/**
 * Azuro Protocol Integration
 * 
 * TODO CURSOR C1: Market Lifecycle Integration
 * ============================================
 * 
 * Replace mock start_time and result fields with real Azuro GraphQL data:
 * 
 * 1. start_time: Use game.startsAt field (Unix timestamp)
 *    - Convert from Unix timestamp to JavaScript Date
 *    - This is when trading automatically locks
 * 
 * 2. result: Use game.status and condition.wonOutcomeIds
 *    - When game.status === 'Resolved', check wonOutcomeIds
 *    - Map to 'yes' (home win) or 'no' (away win)
 * 
 * 3. resolved_at: Use the timestamp when status changed to 'Resolved'
 *    - Track via polling or webhook from Azuro
 * 
 * 4. Server-side validation: Add checks in placePrediction.ts
 *    - Verify market is not locked before accepting trades
 *    - Check game.startsAt > current time
 *    - Return error if trading window closed
 * 
 * 5. Automatic resolution: Poll checkResolvedMarkets() every 5 minutes
 *    - Detect newly resolved games
 *    - Trigger payout process automatically
 *    - Update all open positions for that market
 */

/** Azuro V3 prematch/odds live on the data-feed subgraph, not azuro-api-* */
const DEFAULT_AZURO_DATA_FEED =
  "https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon";

const AZURO_FETCH_TIMEOUT_MS = 15_000;

function azuroGraphqlEndpoint(): string {
  const dataFeed = env.AZURO_DATA_FEED_URL?.trim();
  if (dataFeed) return dataFeed;
  const legacy = env.AZURO_GRAPHQL_URL?.trim();
  if (legacy) return legacy;
  return DEFAULT_AZURO_DATA_FEED;
}

async function azuroGraphqlFetch(body: object): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AZURO_FETCH_TIMEOUT_MS);
  try {
    return await fetch(azuroGraphqlEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readAzuroGraphqlJson(response: Response): Promise<unknown> {
  const text = await response.text();
  const start = text.trimStart();
  if (start.startsWith("<!DOCTYPE") || start.startsWith("<html")) {
    console.error("[Azuro] GraphQL URL returned HTML:", start.slice(0, 200));
    throw new Error(
      "Azuro indexer returned HTML instead of JSON — set AZURO_DATA_FEED_URL (V3 data-feed) or AZURO_GRAPHQL_URL",
    );
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("[Azuro] Non-JSON body:", text.slice(0, 240));
    throw err;
  }
}

// Azuro Game interface from GraphQL
export interface AzuroGame {
  id: string;
  gameId: string;
  sport: {
    name: string;
    slug?: string;
  };
  league: {
    name: string;
    slug?: string;
    country: {
      name: string;
    };
  };
  participants: Array<{
    name: string;
    image?: string;
    sortOrder?: number;
  }>;
  startsAt: string; // Unix timestamp as string
  status?: string;
  state?: string;
  conditions: Array<{
    conditionId: string;
    state?: string;
    outcomes: Array<{
      outcomeId: string;
      title?: string;
      currentOdds?: string; // Decimal odds as string
    }>;
    wonOutcomeIds?: string[];
  }>;
  ipfsHash?: string;
}

// Normalized market data for our app
export interface AzuroMarket extends SeedMarket {
  azuroGameId?: string;
  azuroConditionId?: string;
  azuroStatus?: string;
  azuroResult?: string;
  /** From curated API — higher = more editorial priority (UCL, WC, etc.). */
  importanceScore?: number;
  editorialSlot?:
    | "premiumAnchors"
    | "italyFirst"
    | "unionBerlin"
    | "tennisPremium"
    | "basketballPremium"
    | "motorsportCombat"
    | "adaptiveFallback";
  selectionReason?: string;
  /** Azuro decimal odds for draw (1X2 middle outcome), when available */
  drawOdds?: string | null;
  /** Canonical LP graph allocation from GET /api/markets */
  paperLiquidityAllocation?: number | null;
  paperLiquiditySharePct?: number | null;
}

const AZURO_PAGE_SIZE = 200;
const AZURO_MAX_PAGES = 4;

const AZURO_GAMES_PAGE_QUERY = `
  query GamesPage($first: Int!, $skip: Int!) {
    games(
      first: $first
      skip: $skip
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
        slug
        country {
          name
        }
      }
      participants {
        name
        image
        sortOrder
      }
      conditions(where: { state: Active }) {
        id
        conditionId
        state
        outcomes {
          id
          outcomeId
          title
          currentOdds
        }
      }
      activeConditionsCount
    }
  }
`;

const GAME_DETAIL_QUERY = `
  query GetGameDetail($gameId: String!) {
    games(where: { gameId: $gameId }) {
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
        slug
        country {
          name
        }
      }
      participants {
        name
        image
        sortOrder
      }
      conditions {
        conditionId
        state
        outcomes {
          outcomeId
          title
          currentOdds
        }
        wonOutcomeIds
      }
      ipfsHash
    }
  }
`;

function sortAzuroParticipants<T extends { sortOrder?: number }>(participants: T[]): T[] {
  return [...participants].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
}

/**
 * Transform Azuro decimal odds to normalized YES/NO probabilities
 * Azuro odds are in decimal format (e.g., "2.5" means 2.5x payout)
 * 
 * @param homeOdds - Decimal odds for home team (as string)
 * @param awayOdds - Decimal odds for away team (as string)
 * @returns Object with normalized yesPrice (home win probability) and noPrice
 */
export function transformAzuroOdds(homeOdds: string, awayOdds: string): {
  yesPrice: number;
  noPrice: number;
} {
  const homeOddsNum = parseFloat(homeOdds);
  const awayOddsNum = parseFloat(awayOdds);
  
  // Convert odds to implied probabilities
  // impliedProb = 1 / odds
  const impliedProbHome = 1 / homeOddsNum;
  const impliedProbAway = 1 / awayOddsNum;
  
  // Normalize probabilities to sum to 1
  const total = impliedProbHome + impliedProbAway;
  const yesPrice = impliedProbHome / total;
  const noPrice = impliedProbAway / total;
  
  return {
    yesPrice: Math.max(0.01, Math.min(0.99, yesPrice)),
    noPrice: Math.max(0.01, Math.min(0.99, noPrice)),
  };
}

import { transformAzuroThreeWayOdds } from "~/utils/azuroThreeWayOdds";
export { transformAzuroThreeWayOdds };

function moneylineFromCondition(outcomes: Array<{ currentOdds?: string | null } | undefined>): {
  yesPrice: number;
  drawPrice: number;
  noPrice: number;
  drawOdds: string | null;
} {
  if (outcomes.length >= 3) {
    const h = outcomes[0]?.currentOdds ?? "3.0";
    const d = outcomes[1]?.currentOdds ?? "3.0";
    const a = outcomes[2]?.currentOdds ?? "3.0";
    const t = transformAzuroThreeWayOdds(String(h), String(d), String(a));
    return { yesPrice: t.home, drawPrice: t.draw, noPrice: t.away, drawOdds: String(d) };
  }
  if (outcomes.length >= 2) {
    const h = outcomes[0]?.currentOdds ?? "2.0";
    const a = outcomes[1]?.currentOdds ?? "2.0";
    const p = transformAzuroOdds(String(h), String(a));
    return { yesPrice: p.yesPrice, drawPrice: 0, noPrice: p.noPrice, drawOdds: null };
  }
  return { yesPrice: 0.5, drawPrice: 0, noPrice: 0.5, drawOdds: null };
}

/**
 * Map Azuro sport names to our internal sport slugs
 */
function mapAzuroSportToSlug(sportName: string): string {
  const map: Record<string, string> = {
    Football: "football",
    Soccer: "football",
    Tennis: "tennis",
    Basketball: "basketball",
    "Ice Hockey": "ice-hockey",
    Cricket: "cricket",
    "Table Tennis": "table-tennis",
    "Dota 2": "dota-2",
    "League of Legends": "lol",
    "Counter-Strike 2": "cs2",
  };
  return map[sportName] || sportName.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Get sport emoji from sport slug
 */
function getSportEmoji(sportSlug: string): string {
  const emojiMap: Record<string, string> = {
    'football': '⚽',
    'basketball': '🏀',
    'tennis': '🎾',
    'mma': '🥊',
    'american-football': '🏈',
    'hockey': '🏒',
    'baseball': '⚾',
    'esports': '🎮',
  };
  
  return emojiMap[sportSlug] || '⚽';
}

export type FetchAzuroGamesOptions = {
  /**
   * @deprecated Early tier cap (3+3+3) is removed — all football prematch pages are merged,
   * then `getAzuroMarkets` / curation selects top cards. Kept for API compatibility; ignored.
   */
  skipTiering?: boolean;
};

/**
 * Fetch active prematch games from Azuro (paginated), map to football markets only.
 * Does not apply the old 9-game tier cap — callers curate to featured limits.
 */
export async function fetchAzuroGames(
  _options?: FetchAzuroGamesOptions,
): Promise<AzuroMarket[]> {
  try {
    const mergedGames: AzuroGame[] = [];
    const seenIds = new Set<string>();

    for (let page = 0; page < AZURO_MAX_PAGES; page++) {
      const skip = page * AZURO_PAGE_SIZE;
      const response = await azuroGraphqlFetch({
        query: AZURO_GAMES_PAGE_QUERY,
        variables: { first: AZURO_PAGE_SIZE, skip },
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(
          "[Azuro] GraphQL HTTP error:",
          response.status,
          response.statusText,
          errText.slice(0, 400),
        );
        break;
      }

      const raw = await readAzuroGraphqlJson(response);
      const data = raw as {
        errors?: unknown;
        data?: { games?: AzuroGame[] };
      };

      if (data.errors) {
        console.error("[Azuro] GraphQL errors:", data.errors);
        break;
      }

      const batch = data.data?.games ?? [];
      for (const g of batch) {
        const id = String(g.gameId || "").trim();
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);
        mergedGames.push(g);
      }

      if (batch.length < AZURO_PAGE_SIZE) break;
    }

    const games = mergedGames;

    console.log(
      JSON.stringify({
        tag: "azuro_client_fetch",
        pages: Math.ceil(games.length / AZURO_PAGE_SIZE) || 0,
        rawGames: games.length,
      }),
    );

    /** Football / soccer only — league breadth handled downstream in curation */
    const footballGames = games.filter(
      (game) => mapAzuroSportToSlug(game.sport.name) === "football",
    );

    if (import.meta.env.DEV) {
      console.log(
        JSON.stringify({
          tag: "AZURO_TS_CLIENT_FETCH_NOT_HOMEPAGE",
          NOTE: "Homepage uses GET /api/markets via fetchCuratedMarketsFromApi — NOT this module",
          indexerRawGames: games.length,
          afterFootballOnlyFilter: footballGames.length,
          footballFilter: 'mapAzuroSportToSlug(sport) === "football"',
          nonFootballDropped: games.length - footballGames.length,
        }),
      );
    }

    // Transform Azuro games to our market format (football only)
    const markets: AzuroMarket[] = footballGames.map((game) => {
      const sportSlug = mapAzuroSportToSlug(game.sport.name);
      const ordered = sortAzuroParticipants(game.participants || []);
      const homeTeam = ordered[0]?.name || 'Team A';
      const awayTeam = ordered[1]?.name || 'Team B';
      
      const moneylinePick = pickMoneylineCondition(game.conditions);
      const mainCondition = moneylinePick?.condition ?? game.conditions[0];
      const { yesPrice, drawPrice, noPrice, drawOdds } = moneylineFromCondition(
        mainCondition?.outcomes ?? [],
      );
      
      const startsAt = new Date(parseInt(game.startsAt) * 1000);
      const endsAt = new Date(startsAt.getTime() + 2.5 * 60 * 60 * 1000); // 2.5 hours after start
      
      // Calculate status
      const now = new Date();
      const hoursUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      let status: SeedMarket['status'] = 'upcoming';
      if (hoursUntilStart < 0) {
        status = 'live';
      } else if (hoursUntilStart < 2) {
        status = 'ending-soon';
      }
      
      // Generate mock volume and liquidity based on league importance
      const baseVolume = 50000;
      const volumeMultiplier = game.league.name.toLowerCase().includes('champions') ? 2 : 1;
      const volume24h = Math.floor(baseVolume * volumeMultiplier * (0.8 + Math.random() * 0.4));
      const liquidity = Math.floor(volume24h * 0.6);
      
      const startsAtIso = startsAt.toISOString();
      return {
        id: `azuro-${game.gameId}`,
        question: `Who will win: ${homeTeam} vs ${awayTeam}?`,
        sport: sportSlug,
        sportEmoji: getSportEmoji(sportSlug),
        competition: game.league.name,
        competitionSlug: game.league.slug || game.league.name.toLowerCase().replace(/\s+/g, "-"),
        event: {
          name: `${homeTeam} vs ${awayTeam}`,
          slug: `${homeTeam.toLowerCase().replace(/\s+/g, '-')}-vs-${awayTeam.toLowerCase().replace(/\s+/g, '-')}`,
          startsAt: startsAtIso,
          lockedAt: startsAtIso,
          teams: [homeTeam, awayTeam],
          location: game.league.country?.name,
        },
        outcomes:
          drawOdds != null && drawPrice > 0
            ? [
                {
                  id: "home-win",
                  label: `${homeTeam} wins`,
                  price: yesPrice,
                  volume24h: volume24h * yesPrice,
                },
                { id: "draw", label: "Draw", price: drawPrice, volume24h: volume24h * drawPrice },
                {
                  id: "away-win",
                  label: `${awayTeam} wins`,
                  price: noPrice,
                  volume24h: volume24h * noPrice,
                },
              ]
            : [
                {
                  id: "home-win",
                  label: `${homeTeam} wins`,
                  price: yesPrice,
                  volume24h: volume24h * yesPrice,
                },
                {
                  id: "away-win",
                  label: `${awayTeam} wins`,
                  price: noPrice,
                  volume24h: volume24h * noPrice,
                },
              ],
        volume24h,
        liquidity,
        traders: Math.floor(volume24h / 150),
        status,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        creator: '0xAzuro...Protocol',
        resolutionSources: ['Azuro Protocol Oracle', 'Official League Data'],
        endsAt: endsAt.toISOString(),
        description: `Market resolves automatically via Azuro Protocol oracle based on official ${game.league.name} match result.`,
        isFeatured: game.league.name.toLowerCase().includes('champions') || 
                    game.league.name.toLowerCase().includes('premier') ||
                    volume24h > 100000,
        azuroGameId: game.gameId,
        azuroConditionId: mainCondition?.conditionId,
        azuroStatus: game.state ?? game.status,
        drawOdds: drawOdds ?? undefined,
      };
    });

    if (markets.length === 0) {
      console.warn("[Azuro] No football markets from indexer after pagination");
      return [];
    }

    console.log(
      JSON.stringify({
        tag: "azuro_client_fetch",
        msg: "football_mapped",
        count: markets.length,
      }),
    );
    return markets;

  } catch (error) {
    console.error('[Azuro] Failed to fetch games:', error);
    return [];
  }
}

/**
 * Fetch single game details from Azuro by game ID
 */
export async function fetchAzuroGameDetail(gameId: string): Promise<AzuroMarket | null> {
  try {
    const response = await azuroGraphqlFetch({
        query: GAME_DETAIL_QUERY,
        variables: { gameId },
    });

    if (!response.ok) {
      console.error('[Azuro] Game detail request failed:', response.statusText);
      return null;
    }

    const raw = await readAzuroGraphqlJson(response);
    const data = raw as {
      errors?: unknown;
      data?: { games?: AzuroGame[] };
    };

    if (data.errors || !data.data?.games?.[0]) {
      if (data.errors) {
        console.error("[Azuro] Game not found or error:", data.errors);
      }
      const fromList = await fetchAzuroGames();
      const hit = fromList.find((m) => m.azuroGameId === gameId);
      if (hit) {
        return hit;
      }
      return null;
    }

    const game: AzuroGame = data.data.games[0];
    
    // Transform to our format (same logic as above)
    const sportSlug = mapAzuroSportToSlug(game.sport.name);
    const ordered = sortAzuroParticipants(game.participants || []);
    const homeTeam = ordered[0]?.name || 'Team A';
    const awayTeam = ordered[1]?.name || 'Team B';
    
    const mainCondition = game.conditions[0];
    const { yesPrice, drawPrice, noPrice, drawOdds } = moneylineFromCondition(
      mainCondition?.outcomes ?? [],
    );
    let result: string | undefined;

    if (mainCondition?.wonOutcomeIds && mainCondition.wonOutcomeIds.length > 0) {
      const wonId = mainCondition.wonOutcomeIds[0];
      const outs = mainCondition.outcomes;
      if (outs.length >= 3) {
        if (wonId === outs[0]?.outcomeId) result = "home";
        else if (wonId === outs[1]?.outcomeId) result = "draw";
        else if (wonId === outs[2]?.outcomeId) result = "away";
      } else if (outs.length >= 2) {
        result = wonId === outs[0]?.outcomeId ? "home" : "away";
      }
    }
    
    const startsAt = new Date(parseInt(game.startsAt) * 1000);
    const endsAt = new Date(startsAt.getTime() + 2.5 * 60 * 60 * 1000);
    
    const now = new Date();
    const hoursUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    let status: SeedMarket['status'] = 'upcoming';
    
    const gState = game.state ?? game.status;
    if (gState === 'Resolved' || gState === 'Finished') {
      status = 'resolved';
    } else if (gState === 'Canceled') {
      status = 'locked'; // We'll show as voided in UI
    } else if (hoursUntilStart < 0) {
      status = 'live';
    } else if (hoursUntilStart < 2) {
      status = 'ending-soon';
    }
    
    const volume24h = Math.floor(75000 * (0.8 + Math.random() * 0.4));
    const liquidity = Math.floor(volume24h * 0.6);
    
    return {
      id: `azuro-${game.gameId}`,
      question: `Who will win: ${homeTeam} vs ${awayTeam}?`,
      sport: sportSlug,
      sportEmoji: getSportEmoji(sportSlug),
      competition: game.league.name,
      competitionSlug: game.league.slug || game.league.name.toLowerCase().replace(/\s+/g, "-"),
      event: {
        name: `${homeTeam} vs ${awayTeam}`,
        slug: `${homeTeam.toLowerCase().replace(/\s+/g, '-')}-vs-${awayTeam.toLowerCase().replace(/\s+/g, '-')}`,
        startsAt: startsAt.toISOString(),
        teams: [homeTeam, awayTeam],
        location: game.league.country?.name,
      },
      outcomes:
        drawOdds != null && drawPrice > 0
          ? [
              {
                id: "home-win",
                label: `${homeTeam} wins`,
                price: yesPrice,
                volume24h: volume24h * yesPrice,
              },
              { id: "draw", label: "Draw", price: drawPrice, volume24h: volume24h * drawPrice },
              {
                id: "away-win",
                label: `${awayTeam} wins`,
                price: noPrice,
                volume24h: volume24h * noPrice,
              },
            ]
          : [
              {
                id: "home-win",
                label: `${homeTeam} wins`,
                price: yesPrice,
                volume24h: volume24h * yesPrice,
              },
              {
                id: "away-win",
                label: `${awayTeam} wins`,
                price: noPrice,
                volume24h: volume24h * noPrice,
              },
            ],
      volume24h,
      liquidity,
      traders: Math.floor(volume24h / 150),
      status,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      creator: '0xAzuro...Protocol',
      resolutionSources: ['Azuro Protocol Oracle', 'Official League Data'],
      endsAt: endsAt.toISOString(),
      description: `Market resolves automatically via Azuro Protocol oracle based on official ${game.league.name} match result.`,
      azuroGameId: game.gameId,
      azuroConditionId: mainCondition?.conditionId,
      azuroStatus: gState,
      azuroResult: result,
      drawOdds: drawOdds ?? undefined,
    };
    
  } catch (error) {
    console.error("[Azuro] Failed to fetch game detail:", error);
    try {
      const fromList = await fetchAzuroGames();
      return fromList.find((m) => m.azuroGameId === gameId) ?? null;
    } catch {
      return null;
    }
  }
}

/** Oracle poll result for paper routing (binary settle vs refund vs dispute queue). */
export type AzuroPaperResolutionPollItem =
  | {
      marketId: string;
      conditionId: string;
      kind: "BINARY";
      result: "home" | "away";
    }
  | {
      marketId: string;
      conditionId: string;
      kind: "REFUND";
      refundReason: string;
      rawState?: string;
    }
  | {
      marketId: string;
      conditionId: string;
      kind: "DISPUTE";
      disputeReason: string;
      rawState?: string;
    };

/** Single-game Azuro state for UI settlement diagnostics (read-only). */
export async function fetchAzuroGameForSettlement(
  marketId: string,
): Promise<AzuroGame | null> {
  if (!marketId.startsWith("azuro-")) return null;
  const gameId = marketId.replace(/^azuro-/, "");
  try {
    const response = await azuroGraphqlFetch({
      query: `
        query SettlementGame($gameId: String!) {
          games(where: { gameId: $gameId }) {
            gameId
            state
            conditions {
              conditionId
              wonOutcomeIds
              outcomes { outcomeId title currentOdds }
            }
          }
        }
      `,
      variables: { gameId },
    });
    if (!response.ok) return null;
    const raw = await readAzuroGraphqlJson(response);
    const data = raw as { data?: { games?: AzuroGame[] } };
    return data.data?.games?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Poll Azuro games for terminal / exceptional states affecting paper positions.
 * Idempotent callers should still dedupe by `marketId` before applying DB writes.
 */
export async function checkResolvedMarkets(
  activeMarketIds: string[],
): Promise<AzuroPaperResolutionPollItem[]> {
  try {
    const azuroGameIds = activeMarketIds
      .filter((id) => id.startsWith("azuro-"))
      .map((id) => id.replace("azuro-", ""));

    for (const id of activeMarketIds) {
      if (!id.startsWith("azuro-")) {
        logSettlementDiagnostic(
          classifyAzuroGameForSettlement(id, null),
        );
      }
    }

    if (azuroGameIds.length === 0) {
      return [];
    }

    const response = await azuroGraphqlFetch({
      query: `
          query CheckResolved($gameIds: [String!]!) {
            games(where: { gameId_in: $gameIds }) {
              gameId
              state
              conditions {
                conditionId
                wonOutcomeIds
                outcomes {
                  outcomeId
                }
              }
            }
          }
        `,
      variables: { gameIds: azuroGameIds },
    });

    if (!response.ok) {
      console.error(
        JSON.stringify({
          type: "settlement_azuro_graphql_error",
          status: response.status,
          statusText: response.statusText,
          marketCount: azuroGameIds.length,
        }),
      );
      return [];
    }

    const raw = await readAzuroGraphqlJson(response);
    const data = raw as { data?: { games?: AzuroGame[] }; errors?: unknown };
    if (data.errors) {
      console.error(
        JSON.stringify({
          type: "settlement_azuro_graphql_error",
          errors: data.errors,
          marketCount: azuroGameIds.length,
        }),
      );
    }
    const games: AzuroGame[] = data.data?.games || [];
    const gamesById = new Map(games.map((g) => [String(g.gameId), g]));

    for (const gid of azuroGameIds) {
      const marketId = `azuro-${gid}`;
      if (!gamesById.has(gid)) {
        logSettlementDiagnostic(classifyAzuroGameForSettlement(marketId, null));
      }
    }

    const out: AzuroPaperResolutionPollItem[] = [];

    for (const game of games) {
      const marketId = `azuro-${game.gameId}`;
      const pick = pickMoneylineCondition(game.conditions);
      const main = pick?.condition;
      const rawState = (game.state ?? game.status ?? "").trim();

      const diagnostic = classifyAzuroGameForSettlement(marketId, game);
      if (diagnostic.skipped && diagnostic.reasonCode !== "MARKET_ALREADY_SETTLED") {
        logSettlementDiagnostic(diagnostic);
      }

      if (!main?.conditionId) continue;

      if (/^(Canceled|Cancelled|Voided|Void)$/i.test(rawState)) {
        out.push({
          marketId,
          conditionId: main.conditionId,
          kind: "REFUND",
          refundReason: "VOID",
          rawState,
        });
        continue;
      }

      if (/postpon/i.test(rawState)) {
        out.push({
          marketId,
          conditionId: main.conditionId,
          kind: "DISPUTE",
          disputeReason: "POSTPONED",
          rawState,
        });
        continue;
      }
      if (/suspend/i.test(rawState)) {
        out.push({
          marketId,
          conditionId: main.conditionId,
          kind: "DISPUTE",
          disputeReason: "SUSPENDED",
          rawState,
        });
        continue;
      }
      if (/abandon/i.test(rawState)) {
        out.push({
          marketId,
          conditionId: main.conditionId,
          kind: "DISPUTE",
          disputeReason: "ABANDONED",
          rawState,
        });
        continue;
      }

      if (rawState !== "Resolved" && rawState !== "Finished") {
        continue;
      }

      if (!main.wonOutcomeIds?.[0]) {
        continue;
      }

      const mapped = mapWonOutcomeToHomeAway(main);
      if (mapped === "draw") {
        out.push({
          marketId,
          conditionId: main.conditionId,
          kind: "REFUND",
          refundReason: "DRAW",
          rawState,
        });
        continue;
      }

      if (mapped === "home" || mapped === "away") {
        logSettlementDiagnostic({
          ...classifyAzuroGameForSettlement(marketId, game),
          reasonCode: "SETTLEMENT_ELIGIBLE",
          reasonDetail: `Binary settle → ${mapped} (condition[${pick?.index}] ${pick?.reason})`,
          skipped: false,
        });
        out.push({
          marketId,
          conditionId: main.conditionId,
          kind: "BINARY",
          result: mapped,
        });
      } else {
        logSettlementDiagnostic(
          classifyAzuroGameForSettlement(marketId, game),
        );
      }
    }

    if (out.length > 0) {
      console.log(`[Azuro] Paper poll: ${out.length} market(s) need action`);
    }

    return out;
  } catch (error) {
    console.error("[Azuro] Failed to check resolved markets:", error);
    return [];
  }
}
