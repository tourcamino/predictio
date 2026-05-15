export interface Market {
  id: string;
  sport: string;
  sportEmoji: string;
  league: string;
  region: string;
  teamA: string;
  teamB: string;
  marketType: 'moneyline' | 'spread' | 'over/under' | 'props';
  yesPrice: number; // Price for YES token (0-1)
  noPrice: number; // Price for NO token (0-1), yesPrice + noPrice = 1
  volume: number;
  closesAt: Date;
  traders: number; // Number of unique traders
  isFeatured: boolean;
  location?: string;
  status: 'open' | 'closing-soon' | 'closed' | 'resolved' | 'under_review' | 'voided';
  resolutionReason?: string;
  disputeReason?: string;
  voidedAt?: Date;
  refundAmount?: number;
  reviewSince?: string; // "2h ago"
  tradersAffected?: number;
  priceHistory?: Array<{
    timestamp: Date;
    yesPrice: number;
    noPrice: number;
  }>;
  // Market Lifecycle fields
  start_time: Date; // Kickoff time - when trading locks
  /** Full event line when available (matches DB `event`, Azuro question, etc.). */
  event?: string;
  result?: 'yes' | 'no' | 'draw'; // Only set when market is resolved
  /** Decimal odds string from indexer (e.g. Azuro), for display. */
  drawOdds?: string | null;
  resolved_at?: Date; // Only set when market is resolved
  /** Canonical lifecycle when set by loaders (`deriveMarketLifecycleFrom*` / Prisma→UI). */
  lifecycleState?: import("~/lib/market/marketLifecycleStateMachine").MarketLifecycleState;
  /** Curated catalog appeal score (GET /api/markets). */
  importanceScore?: number;
  /** Editorial band from curated orchestrator (optional on legacy markets). */
  editorialSlot?: import("~/lib/editorialCatalogPresentation").EditorialSlotId;
  // Liquidity & Market Making fields
  liquidity?: {
    totalPool: number;
    yesSide: number;
    noSide: number;
    volume24h: number;
    trades24h: number;
    bidPrice: number;
    askPrice: number;
    spread: number;
    spreadPct: number;
    botActive: boolean;
    lastRebalance?: string;
  };
  // Legacy fields for backwards compatibility (will be removed)
  percentA?: number;
  percentB?: number;
  percentDraw?: number;
  predictions?: number;
}

export interface SportMetadata {
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export const SPORT_METADATA: Record<string, SportMetadata> = {
  football: {
    name: 'Football',
    emoji: '⚽',
    color: '#00FF87',
    bgColor: 'bg-[#00FF87]',
  },
  basketball: {
    name: 'Basketball',
    emoji: '🏀',
    color: '#FF6B35',
    bgColor: 'bg-[#FF6B35]',
  },
  tennis: {
    name: 'Tennis',
    emoji: '🎾',
    color: '#FFE135',
    bgColor: 'bg-[#FFE135]',
  },
  mma: {
    name: 'MMA',
    emoji: '🥊',
    color: '#FF3535',
    bgColor: 'bg-[#FF3535]',
  },
  cricket: {
    name: 'Cricket',
    emoji: '🏏',
    color: '#3580FF',
    bgColor: 'bg-[#3580FF]',
  },
  baseball: {
    name: 'Baseball',
    emoji: '⚾',
    color: '#9B35FF',
    bgColor: 'bg-[#9B35FF]',
  },
  rugby: {
    name: 'Rugby',
    emoji: '🏉',
    color: '#C4823A',
    bgColor: 'bg-[#C4823A]',
  },
  hockey: {
    name: 'Hockey',
    emoji: '🏒',
    color: '#00D4FF',
    bgColor: 'bg-[#00D4FF]',
  },
  esports: {
    name: 'Esports',
    emoji: '🎮',
    color: '#FF35D4',
    bgColor: 'bg-[#FF35D4]',
  },
  f1: {
    name: 'Formula 1',
    emoji: '🏎️',
    color: '#FF1801',
    bgColor: 'bg-[#FF1801]',
  },
};

const FALLBACK_SPORT_META: SportMetadata = {
  name: 'Sports',
  emoji: '🏆',
  color: '#888888',
  bgColor: 'bg-gray-600',
};

/** Safe lookup for UI — unknown sports get a sensible default. */
export function getSportMetadata(sport: string): SportMetadata {
  return SPORT_METADATA[sport] ?? { ...FALLBACK_SPORT_META, name: sport };
}

const now = new Date();

function hoursFromNow(hours: number): Date {
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

function generatePriceHistory(currentYesPrice: number, days: number = 7): Array<{
  timestamp: Date;
  yesPrice: number;
  noPrice: number;
}> {
  const history = [];
  const now = Date.now();
  const startPrice = Math.max(0.3, Math.min(0.7, currentYesPrice - (Math.random() * 0.2 - 0.1)));
  
  for (let i = days * 24; i >= 0; i--) {
    const timestamp = new Date(now - i * 60 * 60 * 1000);
    const progress = 1 - (i / (days * 24));
    const yesPrice = startPrice + (currentYesPrice - startPrice) * progress + (Math.random() * 0.02 - 0.01);
    const normalizedYesPrice = Math.max(0.01, Math.min(0.99, yesPrice));
    
    history.push({
      timestamp,
      yesPrice: normalizedYesPrice,
      noPrice: 1 - normalizedYesPrice,
    });
  }
  
  return history;
}

function generateMockLiquidity(volume: number, yesPrice: number): Market['liquidity'] {
  // Base pool size on volume (roughly 40-60% of volume)
  const totalPool = Math.floor(volume * (0.4 + Math.random() * 0.2));
  
  // Split pool based on current price
  const yesSide = Math.floor(totalPool * yesPrice);
  const noSide = totalPool - yesSide;
  
  // Generate bid/ask with small spread
  const baseSpread = 0.02 + Math.random() * 0.02; // 2-4%
  const bidPrice = yesPrice - baseSpread / 2;
  const askPrice = yesPrice + baseSpread / 2;
  const spread = askPrice - bidPrice;
  const spreadPct = (spread / bidPrice);
  
  // 24h volume is typically 10-30% of total pool
  const volume24h = Math.floor(totalPool * (0.1 + Math.random() * 0.2));
  
  // Trades based on volume
  const trades24h = Math.floor(volume24h / (50 + Math.random() * 150));
  
  // Most bots are active, some are offline
  const botActive = Math.random() > 0.15;
  
  // Random rebalance time
  const rebalanceMinutes = Math.floor(Math.random() * 30);
  const lastRebalance = rebalanceMinutes < 1 
    ? 'Just now' 
    : rebalanceMinutes < 60 
      ? `${rebalanceMinutes} min ago`
      : `${Math.floor(rebalanceMinutes / 60)}h ${rebalanceMinutes % 60}m ago`;
  
  return {
    totalPool,
    yesSide,
    noSide,
    volume24h,
    trades24h,
    bidPrice: Math.max(0.01, bidPrice),
    askPrice: Math.min(0.99, askPrice),
    spread,
    spreadPct,
    botActive,
    lastRebalance,
  };
}

export const mockMarkets: Market[] = [
  // Featured Markets
  {
    id: 'market-1',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'UEFA Champions League',
    region: 'Europe',
    teamA: 'Real Madrid',
    teamB: 'FC Barcelona',
    marketType: 'moneyline',
    yesPrice: 0.62,
    noPrice: 0.38,
    volume: 124500,
    closesAt: hoursFromNow(2.25),
    start_time: hoursFromNow(2.25),
    traders: 847,
    isFeatured: true,
    location: 'Santiago Bernabéu, Madrid, Spain',
    status: 'closing-soon',
    priceHistory: generatePriceHistory(0.62),
    liquidity: {
      totalPool: 48200,
      yesSide: 29900,
      noSide: 18300,
      volume24h: 12450,
      trades24h: 47,
      bidPrice: 0.61,
      askPrice: 0.63,
      spread: 0.02,
      spreadPct: 0.032,
      botActive: true,
      lastRebalance: '4 min ago',
    },
    // Legacy fields
    percentA: 62,
    percentB: 38,
    predictions: 3241,
  },
  {
    id: 'market-2',
    sport: 'mma',
    sportEmoji: '🥊',
    league: 'UFC 310',
    region: 'Americas',
    teamA: 'Dustin Poirier',
    teamB: 'Justin Gaethje',
    marketType: 'moneyline',
    yesPrice: 0.38,
    noPrice: 0.62,
    volume: 89200,
    closesAt: daysFromNow(1.25),
    start_time: daysFromNow(1.25),
    traders: 623,
    isFeatured: true,
    status: 'open',
    priceHistory: generatePriceHistory(0.38),
    percentA: 38,
    percentB: 62,
    predictions: 1876,
  },
  {
    id: 'market-3',
    sport: 'cricket',
    sportEmoji: '🏏',
    league: 'ICC World Cup',
    region: 'Asia-Pacific',
    teamA: 'India',
    teamB: 'Australia',
    marketType: 'moneyline',
    yesPrice: 0.61,
    noPrice: 0.39,
    volume: 203100,
    closesAt: hoursFromNow(3.37),
    start_time: hoursFromNow(3.37),
    traders: 1234,
    isFeatured: true,
    status: 'closing-soon',
    priceHistory: generatePriceHistory(0.61),
    percentA: 61,
    percentB: 39,
    predictions: 5432,
  },
  {
    id: 'market-4',
    sport: 'basketball',
    sportEmoji: '🏀',
    league: 'NBA Playoffs',
    region: 'Americas',
    teamA: 'Los Angeles Lakers',
    teamB: 'Boston Celtics',
    marketType: 'spread',
    yesPrice: 0.44,
    noPrice: 0.56,
    volume: 67800,
    closesAt: hoursFromNow(4.5),
    start_time: hoursFromNow(4.5),
    traders: 456,
    isFeatured: true,
    status: 'open',
    priceHistory: generatePriceHistory(0.44),
    percentA: 44,
    percentB: 56,
    predictions: 2134,
  },
  {
    id: 'market-5',
    sport: 'f1',
    sportEmoji: '🏎️',
    league: 'Monaco Grand Prix',
    region: 'Europe',
    teamA: 'Max Verstappen',
    teamB: 'Charles Leclerc',
    marketType: 'moneyline',
    yesPrice: 0.65,
    noPrice: 0.35,
    volume: 156000,
    closesAt: daysFromNow(2.58),
    start_time: daysFromNow(2.58),
    traders: 892,
    isFeatured: true,
    status: 'open',
    priceHistory: generatePriceHistory(0.65),
    percentA: 65,
    percentB: 35,
    predictions: 4521,
  },
  // Regular Markets - Football
  {
    id: 'market-6',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'Serie A',
    region: 'Europe',
    teamA: 'Inter Milan',
    teamB: 'AC Milan',
    marketType: 'moneyline',
    yesPrice: 0.58,
    noPrice: 0.42,
    volume: 45600,
    closesAt: hoursFromNow(6),
    start_time: hoursFromNow(6),
    traders: 312,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.58),
    percentA: 58,
    percentB: 42,
    predictions: 1234,
  },
  {
    id: 'market-7',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'Premier League',
    region: 'Europe',
    teamA: 'Manchester City',
    teamB: 'Liverpool',
    marketType: 'spread',
    yesPrice: 0.52,
    noPrice: 0.48,
    volume: 98700,
    closesAt: hoursFromNow(8.5),
    start_time: hoursFromNow(8.5),
    traders: 678,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.52),
    percentA: 52,
    percentB: 48,
    predictions: 3456,
  },
  {
    id: 'market-8',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'Bundesliga',
    region: 'Europe',
    teamA: 'Bayern Munich',
    teamB: 'Borussia Dortmund',
    marketType: 'over/under',
    yesPrice: 0.66,
    noPrice: 0.34,
    volume: 76500,
    closesAt: hoursFromNow(12),
    start_time: hoursFromNow(12),
    traders: 534,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.66),
    percentA: 66,
    percentB: 34,
    predictions: 2987,
  },
  {
    id: 'market-9',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'La Liga',
    region: 'Europe',
    teamA: 'Atletico Madrid',
    teamB: 'Sevilla',
    marketType: 'moneyline',
    yesPrice: 0.63,
    noPrice: 0.37,
    volume: 34200,
    closesAt: daysFromNow(1),
    start_time: daysFromNow(1),
    traders: 245,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.63),
    percentA: 63,
    percentB: 37,
    predictions: 987,
  },
  {
    id: 'market-10',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'Copa Libertadores',
    region: 'Americas',
    teamA: 'Flamengo',
    teamB: 'River Plate',
    marketType: 'props',
    yesPrice: 0.54,
    noPrice: 0.46,
    volume: 28900,
    closesAt: daysFromNow(2),
    start_time: daysFromNow(2),
    traders: 198,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.54),
    percentA: 54,
    percentB: 46,
    predictions: 1456,
  },
  // Basketball
  {
    id: 'market-11',
    sport: 'basketball',
    sportEmoji: '🏀',
    league: 'NBA',
    region: 'Americas',
    teamA: 'Golden State Warriors',
    teamB: 'Phoenix Suns',
    marketType: 'spread',
    yesPrice: 0.47,
    noPrice: 0.53,
    volume: 54300,
    closesAt: hoursFromNow(5),
    start_time: hoursFromNow(5),
    traders: 387,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.47),
    percentA: 47,
    percentB: 53,
    predictions: 1876,
  },
  {
    id: 'market-12',
    sport: 'basketball',
    sportEmoji: '🏀',
    league: 'EuroLeague',
    region: 'Europe',
    teamA: 'Real Madrid',
    teamB: 'Barcelona',
    marketType: 'over/under',
    yesPrice: 0.52,
    noPrice: 0.48,
    volume: 32100,
    closesAt: hoursFromNow(10),
    start_time: hoursFromNow(10),
    traders: 276,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.52),
    percentA: 52,
    percentB: 48,
    predictions: 1234,
  },
  {
    id: 'market-13',
    sport: 'basketball',
    sportEmoji: '🏀',
    league: 'NBA G League',
    region: 'Americas',
    teamA: 'Santa Cruz Warriors',
    teamB: 'Austin Spurs',
    marketType: 'moneyline',
    yesPrice: 0.58,
    noPrice: 0.42,
    volume: 12400,
    closesAt: hoursFromNow(7),
    start_time: hoursFromNow(7),
    traders: 89,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.58),
    percentA: 58,
    percentB: 42,
    predictions: 543,
  },
  // Tennis
  {
    id: 'market-14',
    sport: 'tennis',
    sportEmoji: '🎾',
    league: 'Wimbledon',
    region: 'Europe',
    teamA: 'Novak Djokovic',
    teamB: 'Carlos Alcaraz',
    marketType: 'moneyline',
    yesPrice: 0.44,
    noPrice: 0.56,
    volume: 87600,
    closesAt: hoursFromNow(15),
    start_time: hoursFromNow(15),
    traders: 612,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.44),
    percentA: 44,
    percentB: 56,
    predictions: 2345,
  },
  {
    id: 'market-15',
    sport: 'tennis',
    sportEmoji: '🎾',
    league: 'Roland Garros',
    region: 'Europe',
    teamA: 'Rafael Nadal',
    teamB: 'Daniil Medvedev',
    marketType: 'props',
    yesPrice: 0.62,
    noPrice: 0.38,
    volume: 65400,
    closesAt: daysFromNow(1.5),
    start_time: daysFromNow(1.5),
    traders: 478,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.62),
    percentA: 62,
    percentB: 38,
    predictions: 1987,
  },
  // MMA
  {
    id: 'market-16',
    sport: 'mma',
    sportEmoji: '🥊',
    league: 'UFC Fight Night',
    region: 'Americas',
    teamA: 'Alexander Volkanovski',
    teamB: 'Max Holloway',
    marketType: 'moneyline',
    yesPrice: 0.54,
    noPrice: 0.46,
    volume: 43200,
    closesAt: hoursFromNow(18),
    start_time: hoursFromNow(18),
    traders: 334,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.54),
    percentA: 54,
    percentB: 46,
    predictions: 1543,
  },
  {
    id: 'market-17',
    sport: 'mma',
    sportEmoji: '🥊',
    league: 'Bellator',
    region: 'Americas',
    teamA: 'Patricio Freire',
    teamB: 'AJ McKee',
    marketType: 'props',
    yesPrice: 0.49,
    noPrice: 0.51,
    volume: 21800,
    closesAt: daysFromNow(3),
    start_time: daysFromNow(3),
    traders: 167,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.49),
    percentA: 49,
    percentB: 51,
    predictions: 876,
  },
  // Cricket
  {
    id: 'market-18',
    sport: 'cricket',
    sportEmoji: '🏏',
    league: 'IPL',
    region: 'Asia-Pacific',
    teamA: 'Mumbai Indians',
    teamB: 'Chennai Super Kings',
    marketType: 'moneyline',
    yesPrice: 0.53,
    noPrice: 0.47,
    volume: 78900,
    closesAt: hoursFromNow(9),
    start_time: hoursFromNow(9),
    traders: 589,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.53),
    percentA: 53,
    percentB: 47,
    predictions: 3456,
  },
  {
    id: 'market-19',
    sport: 'cricket',
    sportEmoji: '🏏',
    league: 'The Ashes',
    region: 'Europe',
    teamA: 'England',
    teamB: 'Australia',
    marketType: 'over/under',
    yesPrice: 0.45,
    noPrice: 0.55,
    volume: 92300,
    closesAt: daysFromNow(4),
    start_time: daysFromNow(4),
    traders: 723,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.45),
    percentA: 45,
    percentB: 55,
    predictions: 2987,
  },
  // Baseball
  {
    id: 'market-20',
    sport: 'baseball',
    sportEmoji: '⚾',
    league: 'MLB',
    region: 'Americas',
    teamA: 'New York Yankees',
    teamB: 'Boston Red Sox',
    marketType: 'spread',
    yesPrice: 0.51,
    noPrice: 0.49,
    volume: 56700,
    closesAt: hoursFromNow(11),
    start_time: hoursFromNow(11),
    traders: 412,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.51),
    percentA: 51,
    percentB: 49,
    predictions: 1765,
  },
  // Rugby
  {
    id: 'market-21',
    sport: 'rugby',
    sportEmoji: '🏉',
    league: 'Six Nations',
    region: 'Europe',
    teamA: 'England',
    teamB: 'France',
    marketType: 'moneyline',
    yesPrice: 0.47,
    noPrice: 0.53,
    volume: 38900,
    closesAt: daysFromNow(1.75),
    start_time: daysFromNow(1.75),
    traders: 289,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.47),
    percentA: 47,
    percentB: 53,
    predictions: 1234,
  },
  // Hockey
  {
    id: 'market-22',
    sport: 'hockey',
    sportEmoji: '🏒',
    league: 'NHL',
    region: 'Americas',
    teamA: 'Toronto Maple Leafs',
    teamB: 'Montreal Canadiens',
    marketType: 'over/under',
    yesPrice: 0.52,
    noPrice: 0.48,
    volume: 44500,
    closesAt: hoursFromNow(14),
    start_time: hoursFromNow(14),
    traders: 334,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.52),
    percentA: 52,
    percentB: 48,
    predictions: 1543,
  },
  // Esports
  {
    id: 'market-23',
    sport: 'esports',
    sportEmoji: '🎮',
    league: 'League of Legends Worlds',
    region: 'Asia-Pacific',
    teamA: 'T1',
    teamB: 'Gen.G',
    marketType: 'moneyline',
    yesPrice: 0.56,
    noPrice: 0.44,
    volume: 123400,
    closesAt: hoursFromNow(20),
    start_time: hoursFromNow(20),
    traders: 1045,
    isFeatured: false,
    status: 'open',
    priceHistory: generatePriceHistory(0.56),
    percentA: 56,
    percentB: 44,
    predictions: 5678,
  },
  // ════════════════════════════════════════
  // LIFECYCLE TEST MARKETS
  // ════════════════════════════════════════
  // TODO CURSOR C1: Replace these mock markets with real Azuro data
  // using game.startsAt field from GraphQL
  
  // OPEN — Kickoff in 2 hours
  {
    id: 'mock-open-1',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'UEFA Champions League',
    region: 'Europe',
    teamA: 'Inter Milan',
    teamB: 'FC Barcelona',
    marketType: 'moneyline',
    yesPrice: 0.62,
    noPrice: 0.38,
    volume: 45230,
    closesAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000), // Kickoff in 2 hours
    traders: 342,
    isFeatured: false,
    status: 'open',
    location: 'San Siro, Milan, Italy',
    priceHistory: generatePriceHistory(0.62),
    liquidity: generateMockLiquidity(45230, 0.62),
    percentA: 62,
    percentB: 38,
    predictions: 1247,
  },
  
  // LOCKED — Kickoff was 30 minutes ago (match in progress)
  {
    id: 'mock-locked-1',
    sport: 'basketball',
    sportEmoji: '🏀',
    league: 'NBA',
    region: 'Americas',
    teamA: 'Los Angeles Lakers',
    teamB: 'Golden State Warriors',
    marketType: 'moneyline',
    yesPrice: 0.55,
    noPrice: 0.45,
    volume: 23100,
    closesAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    start_time: new Date(Date.now() - 30 * 60 * 1000), // Kickoff was 30 min ago
    traders: 189,
    isFeatured: false,
    status: 'closed', // Market is locked (match in progress)
    location: 'Staples Center, Los Angeles',
    priceHistory: generatePriceHistory(0.55),
    liquidity: generateMockLiquidity(23100, 0.55),
    percentA: 55,
    percentB: 45,
    predictions: 876,
  },
  
  // RESOLVED — YES won (match finished 30 minutes ago)
  {
    id: 'mock-resolved-yes',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'Premier League',
    region: 'Europe',
    teamA: 'Manchester City',
    teamB: 'Arsenal',
    marketType: 'moneyline',
    yesPrice: 1.0, // Final price after resolution
    noPrice: 0.0,
    volume: 67800,
    closesAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    start_time: new Date(Date.now() - 3 * 60 * 60 * 1000), // Kickoff was 3 hours ago
    traders: 523,
    isFeatured: false,
    status: 'resolved',
    result: 'yes', // YES (Manchester City) won
    resolved_at: new Date(Date.now() - 30 * 60 * 1000), // Resolved 30 min ago
    location: 'Etihad Stadium, Manchester',
    priceHistory: generatePriceHistory(0.58),
    liquidity: generateMockLiquidity(67800, 1.0),
    percentA: 100,
    percentB: 0,
    predictions: 2341,
    resolutionReason: 'Manchester City won 2-1. Market resolved by Azuro oracle.',
  },
  
  // RESOLVED — NO won
  {
    id: 'mock-resolved-no',
    sport: 'tennis',
    sportEmoji: '🎾',
    league: 'Wimbledon',
    region: 'Europe',
    teamA: 'Novak Djokovic',
    teamB: 'Carlos Alcaraz',
    marketType: 'moneyline',
    yesPrice: 0.0,
    noPrice: 1.0, // Final price after resolution
    volume: 41200,
    closesAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    start_time: new Date(Date.now() - 5 * 60 * 60 * 1000), // Match started 5 hours ago
    traders: 287,
    isFeatured: false,
    status: 'resolved',
    result: 'no', // NO (Alcaraz) won
    resolved_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // Resolved 1 hour ago
    location: 'Centre Court, Wimbledon',
    priceHistory: generatePriceHistory(0.44),
    liquidity: generateMockLiquidity(41200, 0.0),
    percentA: 0,
    percentB: 100,
    predictions: 1543,
    resolutionReason: 'Carlos Alcaraz won 3-1. Market resolved by Azuro oracle.',
  },

  // RESOLVED — YES won (Bundesliga; copy-seed variety on platform markets)
  {
    id: 'mock-resolved-bayern-dortmund',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'Bundesliga',
    region: 'Europe',
    teamA: 'Bayern Munich',
    teamB: 'Borussia Dortmund',
    marketType: 'moneyline',
    yesPrice: 1.0,
    noPrice: 0.0,
    volume: 52100,
    closesAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
    start_time: new Date(Date.now() - 26 * 60 * 60 * 1000),
    traders: 401,
    isFeatured: false,
    status: 'resolved',
    result: 'yes',
    resolved_at: new Date(Date.now() - 18 * 60 * 60 * 1000),
    location: 'Allianz Arena, Munich',
    priceHistory: generatePriceHistory(0.64),
    liquidity: generateMockLiquidity(52100, 1.0),
    percentA: 100,
    percentB: 0,
    predictions: 1822,
    resolutionReason: 'Bayern Munich won 3-2. Market resolved by Azuro oracle.',
  },
  
  // CLOSING SOON — Kickoff in 4 minutes (urgency test)
  {
    id: 'mock-closing-soon',
    sport: 'tennis',
    sportEmoji: '🎾',
    league: 'Roland Garros',
    region: 'Europe',
    teamA: 'Novak Djokovic',
    teamB: 'Carlos Alcaraz',
    marketType: 'moneyline',
    yesPrice: 0.71,
    noPrice: 0.29,
    volume: 12400,
    closesAt: new Date(Date.now() + 4 * 60 * 1000), // 4 minutes from now
    start_time: new Date(Date.now() + 4 * 60 * 1000), // Kickoff in 4 minutes
    traders: 98,
    isFeatured: false,
    status: 'closing-soon',
    location: 'Court Philippe-Chatrier, Paris',
    priceHistory: generatePriceHistory(0.71),
    liquidity: generateMockLiquidity(12400, 0.71),
    percentA: 71,
    percentB: 29,
    predictions: 456,
  },
];

// Add liquidity data to all markets after they're defined
mockMarkets.forEach(market => {
  if (!market.liquidity) {
    market.liquidity = generateMockLiquidity(market.volume, market.yesPrice);
  }
});

export function getMarketsByFilters(
  markets: Market[],
  filters: {
    sport: string;
    region: string;
    searchQuery: string;
    minVolume?: number;
    maxVolume?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    minOdds?: number;
    maxOdds?: number;
    analystRecommended?: boolean;
  }
): Market[] {
  return markets.filter((market) => {
    const sportMatch = filters.sport === 'all' || market.sport === filters.sport;
    const regionMatch = filters.region === 'all' || market.region === filters.region;
    const searchMatch =
      filters.searchQuery === '' ||
      market.teamA.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      market.teamB.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      market.league.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      market.region.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      (market.location && market.location.toLowerCase().includes(filters.searchQuery.toLowerCase())) ||
      (SPORT_METADATA[market.sport]?.name.toLowerCase().includes(filters.searchQuery.toLowerCase()));
    
    const volumeMatch =
      (filters.minVolume === undefined || market.volume >= filters.minVolume) &&
      (filters.maxVolume === undefined || market.volume <= filters.maxVolume);
    
    const statusMatch = !filters.status || filters.status === 'all' || market.status === filters.status;

    // Date range filter - check if market closes within the specified range
    let dateMatch = true;
    if (filters.startDate || filters.endDate) {
      const marketCloseTime = market.closesAt.getTime();
      if (filters.startDate) {
        const startTime = new Date(filters.startDate).getTime();
        dateMatch = dateMatch && marketCloseTime >= startTime;
      }
      if (filters.endDate) {
        const endTime = new Date(filters.endDate).getTime() + 24 * 60 * 60 * 1000; // Include the entire end date
        dateMatch = dateMatch && marketCloseTime <= endTime;
      }
    }

    // Odds range filter - check if YES price falls within the specified range
    let oddsMatch = true;
    if (filters.minOdds !== undefined || filters.maxOdds !== undefined) {
      const yesPrice = market.yesPrice;
      if (filters.minOdds !== undefined) {
        oddsMatch = oddsMatch && yesPrice >= filters.minOdds;
      }
      if (filters.maxOdds !== undefined) {
        oddsMatch = oddsMatch && yesPrice <= filters.maxOdds;
      }
    }

    // Analyst recommended filter - for now, randomly mark some markets as recommended
    // In production, this would check actual analyst recommendations
    let analystMatch = true;
    if (filters.analystRecommended) {
      // Mock: markets with high volume and good odds are "recommended"
      analystMatch = market.volume > 50000 && market.yesPrice > 0.4 && market.yesPrice < 0.7;
    }

    return sportMatch && regionMatch && searchMatch && volumeMatch && statusMatch && dateMatch && oddsMatch && analystMatch;
  });
}

export function sortMarkets(markets: Market[], sortBy: string): Market[] {
  const sorted = [...markets];

  switch (sortBy) {
    case 'volume':
      return sorted.sort((a, b) => b.volume - a.volume);
    case 'closing-soon':
      return sorted.sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime());
    case 'newest':
      return sorted.sort((a, b) => b.closesAt.getTime() - a.closesAt.getTime());
    case 'most-predicted':
    case 'most-popular':
      return sorted.sort((a, b) => b.traders - a.traders);
    default:
      return sorted;
  }
}

export function getFeaturedMarkets(): Market[] {
  return mockMarkets.filter((m) => m.isFeatured);
}

export function getMarketById(id: string): Market | undefined {
  return mockMarkets.find((market) => market.id === id);
}
