import { SEED_MARKETS, SeedMarket } from "~/data/seedMarkets";
import { MAX_FOOTBALL_MARKETS } from "~/constants/azuro";
import { env } from "~/server/env";

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
}

const PRIORITY_LEAGUE_MARKERS = [
  "champions league",
  "premier league",
  "serie a",
  "la liga",
  "bundesliga",
  "ligue 1",
  "europa league",
  "eredivisie",
] as const;

function leaguePriorityScore(competition: string): number {
  const n = competition.toLowerCase();
  let best = 0;
  PRIORITY_LEAGUE_MARKERS.forEach((marker, i) => {
    if (n.includes(marker)) {
      best = Math.max(best, (PRIORITY_LEAGUE_MARKERS.length - i) * 1_000_000);
    }
  });
  return best;
}

function interestScore(m: AzuroMarket): number {
  return leaguePriorityScore(m.competition) + m.volume24h;
}

/** Hours until kickoff from normalized market payload */
export function hoursUntilStartMarket(m: AzuroMarket): number {
  const t = new Date(m.event.startsAt).getTime();
  return (t - Date.now()) / (1000 * 60 * 60);
}

/**
 * Exactly {@link MAX_FOOTBALL_MARKETS}: 3 imminent (≤48h), 3 medium (48h–7d), 3 long (7–14d),
 * prioritising major leagues + volume; backfills if a bucket is short.
 */
export function pickTieredFootballMarkets(markets: AzuroMarket[]): AzuroMarket[] {
  const valid = markets.filter((m) => {
    if (m.sport !== "football") return false;
    const h = hoursUntilStartMarket(m);
    return h > 0 && h <= 336;
  });

  const byInterest = (a: AzuroMarket, b: AzuroMarket) =>
    interestScore(b) - interestScore(a);

  const imminent = valid
    .filter((m) => {
      const h = hoursUntilStartMarket(m);
      return h > 0 && h <= 48;
    })
    .sort(byInterest);

  const medium = valid
    .filter((m) => {
      const h = hoursUntilStartMarket(m);
      return h > 48 && h <= 168;
    })
    .sort(byInterest);

  const longT = valid
    .filter((m) => {
      const h = hoursUntilStartMarket(m);
      return h > 168 && h <= 336;
    })
    .sort(byInterest);

  const picked: AzuroMarket[] = [
    ...imminent.slice(0, 3),
    ...medium.slice(0, 3),
    ...longT.slice(0, 3),
  ];

  const used = new Set(picked.map((p) => p.id));
  if (picked.length < MAX_FOOTBALL_MARKETS) {
    for (const m of [...valid].sort(byInterest)) {
      if (picked.length >= MAX_FOOTBALL_MARKETS) break;
      if (!used.has(m.id)) {
        picked.push(m);
        used.add(m.id);
      }
    }
  }

  return picked.slice(0, MAX_FOOTBALL_MARKETS);
}

const AZURO_GAMES_QUERY = `
  query Games {
    games(
      first: 200
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
   * When true, return all mapped football games from the indexer (no 3+3+3 tier pick).
   * Use when intersecting with founder-curated `gameId`s so the list is not reduced to 9 first.
   */
  skipTiering?: boolean;
};

/**
 * Fetch active games from Azuro Protocol
 * Filters for: Champions League, Serie A, Premier League, NBA, MMA
 * Falls back to mock data if Azuro is unavailable
 */
export async function fetchAzuroGames(
  options?: FetchAzuroGamesOptions,
): Promise<AzuroMarket[]> {
  try {
    const response = await azuroGraphqlFetch({
      query: AZURO_GAMES_QUERY,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(
        "[Azuro] GraphQL HTTP error:",
        response.status,
        response.statusText,
        errText.slice(0, 400),
      );
      return mapMockMarketsToAzuroFormat();
    }

    const raw = await readAzuroGraphqlJson(response);
    const data = raw as {
      errors?: unknown;
      data?: { games?: AzuroGame[] };
    };

    if (data.errors) {
      console.error('[Azuro] GraphQL errors:', data.errors);
      return mapMockMarketsToAzuroFormat();
    }

    const games: AzuroGame[] = data.data?.games || [];

    /** Football / soccer only — league breadth handled in tier scoring */
    const footballGames = games.filter(
      (game) => mapAzuroSportToSlug(game.sport.name) === "football",
    );

    // Transform Azuro games to our market format (football only)
    const markets: AzuroMarket[] = footballGames.map(game => {
      const sportSlug = mapAzuroSportToSlug(game.sport.name);
      const ordered = sortAzuroParticipants(game.participants || []);
      const homeTeam = ordered[0]?.name || 'Team A';
      const awayTeam = ordered[1]?.name || 'Team B';
      
      // Get main match winner condition (usually the first one)
      const mainCondition = game.conditions[0];
      let yesPrice = 0.5;
      let noPrice = 0.5;
      
      if (mainCondition && mainCondition.outcomes.length >= 2) {
        const homeOdds = mainCondition.outcomes[0]?.currentOdds || '2.0';
        const awayOdds = mainCondition.outcomes[1]?.currentOdds || '2.0';
        const prices = transformAzuroOdds(homeOdds, awayOdds);
        yesPrice = prices.yesPrice;
        noPrice = prices.noPrice;
      }
      
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
        outcomes: [
          { id: 'home-win', label: `${homeTeam} wins`, price: yesPrice, volume24h: volume24h * yesPrice },
          { id: 'away-win', label: `${awayTeam} wins`, price: noPrice, volume24h: volume24h * noPrice },
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
      };
    });

    if (options?.skipTiering) {
      console.log(
        `[Azuro] Fetched ${markets.length} football markets (no tier cap — for curation / full list)`,
      );
      return markets;
    }

    const tiered = pickTieredFootballMarkets(markets);

    if (tiered.length === 0) {
      console.warn("[Azuro] No tiered football markets from indexer, using seed fallback");
      return mapMockMarketsToAzuroFormat();
    }

    console.log(
      `[Azuro] Fetched ${tiered.length} tiered football markets from Azuro Protocol`,
    );
    return tiered;
    
  } catch (error) {
    console.error('[Azuro] Failed to fetch games:', error);
    return mapMockMarketsToAzuroFormat();
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
      const fromList = await fetchAzuroGames({ skipTiering: true });
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
    let yesPrice = 0.5;
    let noPrice = 0.5;
    let result: string | undefined;
    
    if (mainCondition) {
      if (mainCondition.outcomes.length >= 2) {
        const homeOdds = mainCondition.outcomes[0]?.currentOdds || '2.0';
        const awayOdds = mainCondition.outcomes[1]?.currentOdds || '2.0';
        const prices = transformAzuroOdds(homeOdds, awayOdds);
        yesPrice = prices.yesPrice;
        noPrice = prices.noPrice;
      }
      
      // Check if resolved
      if (mainCondition.wonOutcomeIds && mainCondition.wonOutcomeIds.length > 0) {
        const wonId = mainCondition.wonOutcomeIds[0];
        result = wonId === mainCondition.outcomes[0]?.outcomeId ? 'home' : 'away';
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
      outcomes: [
        { id: 'home-win', label: `${homeTeam} wins`, price: yesPrice, volume24h: volume24h * yesPrice },
        { id: 'away-win', label: `${awayTeam} wins`, price: noPrice, volume24h: volume24h * noPrice },
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
    };
    
  } catch (error) {
    console.error("[Azuro] Failed to fetch game detail:", error);
    try {
      const fromList = await fetchAzuroGames({ skipTiering: true });
      return fromList.find((m) => m.azuroGameId === gameId) ?? null;
    } catch {
      return null;
    }
  }
}

/**
 * Map SEED_MARKETS to AzuroMarket format for fallback
 */
function mapMockMarketsToAzuroFormat(): AzuroMarket[] {
  const mapped = SEED_MARKETS.filter((m) => m.sport === "football").map(
    (market) => ({
      ...market,
      azuroGameId: undefined,
      azuroConditionId: undefined,
      azuroStatus: undefined,
    }),
  );
  const tiered = pickTieredFootballMarkets(mapped);
  if (tiered.length > 0) return tiered;
  return mapped.slice(0, MAX_FOOTBALL_MARKETS);
}

/** Used when Azuro returns nothing or UI filters would show an empty grid */
export function getSeedMarketsAsAzuro(): AzuroMarket[] {
  return mapMockMarketsToAzuroFormat();
}

/**
 * Check for resolved markets (for oracle polling every 5 minutes)
 * Returns markets that have been resolved since last check
 */
export async function checkResolvedMarkets(
  activeMarketIds: string[]
): Promise<Array<{ marketId: string; result: string; conditionId: string }>> {
  try {
    // Extract Azuro game IDs from market IDs
    const azuroGameIds = activeMarketIds
      .filter(id => id.startsWith('azuro-'))
      .map(id => id.replace('azuro-', ''));
    
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
      return [];
    }

    const raw = await readAzuroGraphqlJson(response);
    const data = raw as { data?: { games?: AzuroGame[] } };
    const games: AzuroGame[] = data.data?.games || [];
    
    const resolved = games
      .filter((game) => {
        const s = game.state ?? game.status;
        return s === "Resolved" || s === "Finished";
      })
      .map(game => {
        const mainCondition = game.conditions[0];
        if (!mainCondition?.wonOutcomeIds?.[0]) {
          return null;
        }
        
        const wonId = mainCondition.wonOutcomeIds[0];
        const result = wonId === mainCondition.outcomes[0]?.outcomeId ? 'home' : 'away';
        
        return {
          marketId: `azuro-${game.gameId}`,
          result,
          conditionId: mainCondition.conditionId,
        };
      })
      .filter((r): r is { marketId: string; result: string; conditionId: string } => r !== null);
    
    if (resolved.length > 0) {
      console.log(`[Azuro] Found ${resolved.length} newly resolved markets`);
    }
    
    return resolved;
    
  } catch (error) {
    console.error('[Azuro] Failed to check resolved markets:', error);
    return [];
  }
}
