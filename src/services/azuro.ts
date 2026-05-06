import { SEED_MARKETS, SeedMarket } from '~/data/seedMarkets';

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

// Azuro GraphQL endpoint
const AZURO_ENDPOINT = 'https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-base-v3';

// Azuro Game interface from GraphQL
export interface AzuroGame {
  id: string;
  gameId: string;
  sport: {
    sportId: string;
    name: string;
  };
  league: {
    name: string;
    slug: string;
    country: {
      name: string;
    };
  };
  participants: Array<{
    name: string;
    image?: string;
  }>;
  startsAt: string; // Unix timestamp as string
  status: 'Created' | 'Paused' | 'Canceled' | 'Resolved';
  conditions: Array<{
    conditionId: string;
    status: string;
    outcomes: Array<{
      outcomeId: string;
      odds: string; // Decimal odds as string
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

const ACTIVE_GAMES_QUERY = `
  query GetActiveGames($first: Int!, $where: Game_filter) {
    games(
      first: $first
      where: $where
      orderBy: startsAt
      orderDirection: asc
    ) {
      id
      gameId
      sport {
        sportId
        name
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
      }
      startsAt
      status
      conditions(where: { status: "Created" }) {
        conditionId
        status
        outcomes {
          outcomeId
          odds
        }
      }
    }
  }
`;

const GAME_DETAIL_QUERY = `
  query GetGameDetail($gameId: String!) {
    games(where: { gameId: $gameId }) {
      id
      gameId
      sport {
        sportId
        name
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
      }
      startsAt
      status
      conditions {
        conditionId
        status
        outcomes {
          outcomeId
          odds
        }
        wonOutcomeIds
      }
      ipfsHash
    }
  }
`;

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
function mapAzuroSportToSlug(azuroSport: string): string {
  const sportMap: Record<string, string> = {
    'Soccer': 'football',
    'Football': 'football',
    'Basketball': 'basketball',
    'Tennis': 'tennis',
    'MMA': 'mma',
    'Mixed Martial Arts': 'mma',
    'American Football': 'american-football',
    'Ice Hockey': 'hockey',
    'Baseball': 'baseball',
    'Esports': 'esports',
  };
  
  return sportMap[azuroSport] || 'football';
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

/**
 * Fetch active games from Azuro Protocol
 * Filters for: Champions League, Serie A, Premier League, NBA, MMA
 * Falls back to mock data if Azuro is unavailable
 */
export async function fetchAzuroGames(): Promise<AzuroMarket[]> {
  try {
    const response = await fetch(AZURO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: ACTIVE_GAMES_QUERY,
        variables: {
          first: 100,
          where: {
            status_in: ['Created', 'Paused'],
            startsAt_gt: Math.floor(Date.now() / 1000).toString(),
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('[Azuro] GraphQL request failed:', response.statusText);
      return mapMockMarketsToAzuroFormat();
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('[Azuro] GraphQL errors:', data.errors);
      return mapMockMarketsToAzuroFormat();
    }

    const games: AzuroGame[] = data.data?.games || [];
    
    // Filter for supported leagues - prioritize Champions League and Serie A
    const filteredGames = games.filter(game => {
      const leagueName = game.league.name.toLowerCase();
      return (
        leagueName.includes('champions league') ||
        leagueName.includes('serie a') ||
        leagueName.includes('europa league') ||
        leagueName.includes('premier league') ||
        leagueName.includes('la liga') ||
        leagueName.includes('bundesliga') ||
        leagueName.includes('ligue 1') ||
        leagueName.includes('eredivisie')
      );
    });

    // Sort to prioritize Champions League and Serie A
    filteredGames.sort((a, b) => {
      const aLeague = a.league.name.toLowerCase();
      const bLeague = b.league.name.toLowerCase();
      
      const aIsPriority = aLeague.includes('champions league') || aLeague.includes('serie a');
      const bIsPriority = bLeague.includes('champions league') || bLeague.includes('serie a');
      
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      
      // Secondary sort by start time (soonest first)
      return parseInt(a.startsAt) - parseInt(b.startsAt);
    });

    // Transform Azuro games to our market format
    const markets: AzuroMarket[] = filteredGames.map(game => {
      const sportSlug = mapAzuroSportToSlug(game.sport.name);
      const homeTeam = game.participants[0]?.name || 'Team A';
      const awayTeam = game.participants[1]?.name || 'Team B';
      
      // Get main match winner condition (usually the first one)
      const mainCondition = game.conditions[0];
      let yesPrice = 0.5;
      let noPrice = 0.5;
      
      if (mainCondition && mainCondition.outcomes.length >= 2) {
        const homeOdds = mainCondition.outcomes[0]?.odds || '2.0';
        const awayOdds = mainCondition.outcomes[1]?.odds || '2.0';
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
      
      return {
        id: `azuro-${game.gameId}`,
        question: `Who will win: ${homeTeam} vs ${awayTeam}?`,
        sport: sportSlug,
        sportEmoji: getSportEmoji(sportSlug),
        competition: game.league.name,
        competitionSlug: game.league.slug,
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
        isFeatured: game.league.name.toLowerCase().includes('champions') || 
                    game.league.name.toLowerCase().includes('premier') ||
                    volume24h > 100000,
        azuroGameId: game.gameId,
        azuroConditionId: mainCondition?.conditionId,
        azuroStatus: game.status,
      };
    });

    // If we got no markets from Azuro, fall back to mock
    if (markets.length === 0) {
      console.warn('[Azuro] No markets returned, using mock data');
      return mapMockMarketsToAzuroFormat();
    }

    console.log(`[Azuro] Fetched ${markets.length} markets from Azuro Protocol`);
    return markets;
    
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
    const response = await fetch(AZURO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GAME_DETAIL_QUERY,
        variables: { gameId },
      }),
    });

    if (!response.ok) {
      console.error('[Azuro] Game detail request failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.errors || !data.data?.games?.[0]) {
      console.error('[Azuro] Game not found or error:', data.errors);
      return null;
    }

    const game: AzuroGame = data.data.games[0];
    
    // Transform to our format (same logic as above)
    const sportSlug = mapAzuroSportToSlug(game.sport.name);
    const homeTeam = game.participants[0]?.name || 'Team A';
    const awayTeam = game.participants[1]?.name || 'Team B';
    
    const mainCondition = game.conditions[0];
    let yesPrice = 0.5;
    let noPrice = 0.5;
    let result: string | undefined;
    
    if (mainCondition) {
      if (mainCondition.outcomes.length >= 2) {
        const homeOdds = mainCondition.outcomes[0]?.odds || '2.0';
        const awayOdds = mainCondition.outcomes[1]?.odds || '2.0';
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
    
    if (game.status === 'Resolved') {
      status = 'resolved';
    } else if (game.status === 'Canceled') {
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
      competitionSlug: game.league.slug,
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
      azuroStatus: game.status,
      azuroResult: result,
    };
    
  } catch (error) {
    console.error('[Azuro] Failed to fetch game detail:', error);
    return null;
  }
}

/**
 * Map SEED_MARKETS to AzuroMarket format for fallback
 */
function mapMockMarketsToAzuroFormat(): AzuroMarket[] {
  return SEED_MARKETS.map(market => ({
    ...market,
    azuroGameId: undefined,
    azuroConditionId: undefined,
    azuroStatus: undefined,
  }));
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

    const response = await fetch(AZURO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query CheckResolved($gameIds: [String!]!) {
            games(where: { gameId_in: $gameIds, status: "Resolved" }) {
              gameId
              status
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
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const games: AzuroGame[] = data.data?.games || [];
    
    const resolved = games
      .filter(game => game.status === 'Resolved')
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
