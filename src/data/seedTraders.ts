export interface TraderProfile {
  address: string;
  ensName: string | null;
  rank: number;
  roi: number; // percentage
  roiAllTime: number;
  roi7d: number;
  roi30d: number;
  roi90d: number;
  trades: number;
  trades7d: number;
  trades30d: number;
  trades90d: number;
  volume: number; // USDC
  volume7d: number;
  volume30d: number;
  volume90d: number;
  winRate: number; // percentage
  sharpeRatio: number;
  profitFactor: number;
  maxDrawdown: number; // percentage (negative)
  avgTradeSize: number;
  activeSinceDays: number;
  lastTradeHours: number;
  specialties: Array<{
    sport: string;
    volumePct: number;
    roi: number;
  }>;
  starRating: number; // 0-5
}

function calculateStarRating(params: {
  roi: number;
  volume: number;
  trades: number;
  winRate: number;
  sharpeRatio: number;
}): number {
  let score = 0;

  // ROI contribution (max 2 stars)
  if (params.roi > 100) score += 2;
  else if (params.roi > 50) score += 1.5;
  else if (params.roi > 25) score += 1;
  else if (params.roi > 10) score += 0.5;

  // Volume contribution (max 1 star)
  if (params.volume > 100000) score += 1;
  else if (params.volume > 50000) score += 0.75;
  else if (params.volume > 10000) score += 0.5;
  else if (params.volume > 5000) score += 0.25;

  // Trade count contribution (max 1 star)
  if (params.trades > 500) score += 1;
  else if (params.trades > 100) score += 0.75;
  else if (params.trades > 50) score += 0.5;
  else if (params.trades > 10) score += 0.25;

  // Win rate contribution (max 0.5 stars)
  if (params.winRate > 70) score += 0.5;
  else if (params.winRate > 60) score += 0.25;

  // Sharpe ratio contribution (max 0.5 stars)
  if (params.sharpeRatio > 2) score += 0.5;
  else if (params.sharpeRatio > 1) score += 0.25;

  return Math.min(5, Math.max(0, score));
}

function generateRandomTrader(index: number): TraderProfile {
  // Generate address
  const address = `0x${Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}`;

  // 20% chance of having ENS name
  const ensNames = [
    'vitalik.eth',
    'sports-wizard.eth',
    'prediction-king.eth',
    'market-maker.eth',
    'crypto-trader.eth',
    'degen-sports.eth',
    'odds-master.eth',
    'bet-genius.eth',
    'trade-lord.eth',
    'profit-seeker.eth',
  ];
  const ensName = Math.random() < 0.2 ? ensNames[Math.floor(Math.random() * ensNames.length)] : null;

  // ROI distribution: mean 10%, stddev 80%
  const roi30d = Math.max(-95, Math.min(500, 10 + (Math.random() - 0.5) * 160));
  const roi7d = Math.max(-95, Math.min(500, roi30d * (0.3 + Math.random() * 0.4)));
  const roi90d = Math.max(-95, Math.min(500, roi30d * (0.9 + Math.random() * 0.3)));
  const roiAllTime = Math.max(-95, Math.min(500, roi90d * (0.95 + Math.random() * 0.2)));

  // Trade count: exponential distribution favoring fewer trades
  const trades30d = Math.floor(Math.exp(Math.random() * 7)); // 1 to ~1000
  const trades7d = Math.floor(trades30d * (0.15 + Math.random() * 0.2));
  const trades90d = Math.floor(trades30d * (2.5 + Math.random() * 1));
  const tradesAllTime = Math.floor(trades90d * (1.2 + Math.random() * 0.5));

  // Volume: correlated with trade count
  const avgTradeSize = 50 + Math.random() * 200;
  const volume30d = trades30d * avgTradeSize;
  const volume7d = trades7d * avgTradeSize;
  const volume90d = trades90d * avgTradeSize;
  const volumeAllTime = tradesAllTime * avgTradeSize;

  // Win rate: mean 55%, stddev 10%
  const winRate = Math.max(30, Math.min(85, 55 + (Math.random() - 0.5) * 20));

  // Sharpe ratio: correlated with ROI but with noise
  const sharpeRatio = Math.max(-2, Math.min(5, (roi30d / 30) + (Math.random() - 0.5) * 1));

  // Profit factor
  const profitFactor = Math.max(0.5, Math.min(5, 1 + (roi30d / 100) + (Math.random() - 0.5) * 0.5));

  // Max drawdown: negative, worse for riskier traders
  const maxDrawdown = Math.max(-60, Math.min(-5, -15 - Math.random() * 20));

  // Active since: 1 to 300 days
  const activeSinceDays = Math.floor(1 + Math.random() * 300);

  // Last trade: 0.5 to 48 hours ago
  const lastTradeHours = 0.5 + Math.random() * 47.5;

  // Specialties: 2-4 sports
  const sports = ['football', 'basketball', 'tennis', 'american-football', 'hockey', 'esports'];
  const numSpecialties = 2 + Math.floor(Math.random() * 3);
  const selectedSports = sports.sort(() => Math.random() - 0.5).slice(0, numSpecialties);
  
  let remainingPct = 100;
  const specialties = selectedSports.map((sport, i) => {
    const isLast = i === selectedSports.length - 1;
    const volumePct = isLast ? remainingPct : Math.floor(Math.random() * remainingPct);
    remainingPct -= volumePct;
    
    return {
      sport,
      volumePct,
      roi: Math.max(-50, Math.min(200, roi30d + (Math.random() - 0.5) * 40)),
    };
  }).sort((a, b) => b.volumePct - a.volumePct);

  // Star rating: composite score
  const starRating = calculateStarRating({
    roi: roi30d,
    volume: volume30d,
    trades: trades30d,
    winRate,
    sharpeRatio,
  });

  return {
    address,
    ensName,
    rank: index + 1,
    roi: roi30d,
    roiAllTime,
    roi7d,
    roi30d,
    roi90d,
    trades: tradesAllTime,
    trades7d,
    trades30d,
    trades90d,
    volume: volumeAllTime,
    volume7d,
    volume30d,
    volume90d,
    winRate,
    sharpeRatio,
    profitFactor,
    maxDrawdown,
    avgTradeSize,
    activeSinceDays,
    lastTradeHours,
    specialties,
    starRating,
  };
}

export const SEED_TRADERS: TraderProfile[] = Array.from({ length: 100 }, (_, i) =>
  generateRandomTrader(i)
).sort((a, b) => b.roi30d - a.roi30d); // Sort by 30d ROI by default

// Helper to get trader by address
export function getTraderByAddress(address: string): TraderProfile | undefined {
  return SEED_TRADERS.find((t) => t.address.toLowerCase() === address.toLowerCase());
}

// Helper to filter and sort traders
export interface LeaderboardFilters {
  timeframe: '7d' | '30d' | '90d' | 'all';
  category: string | null; // sport slug or null for all
  minTrades: number;
  sortBy: 'roi' | 'volume' | 'sharpe' | 'winRate' | 'trades';
}

export function filterTraders(filters: LeaderboardFilters): TraderProfile[] {
  let filtered = SEED_TRADERS;

  // Filter by minimum trades
  const tradesKey = filters.timeframe === '7d' ? 'trades7d' :
                    filters.timeframe === '30d' ? 'trades30d' :
                    filters.timeframe === '90d' ? 'trades90d' : 'trades';
  filtered = filtered.filter((t) => t[tradesKey] >= filters.minTrades);

  // Filter by category (specialty)
  if (filters.category) {
    filtered = filtered.filter((t) =>
      t.specialties.some((s) => s.sport === filters.category)
    );
  }

  // Sort
  const roiKey = filters.timeframe === '7d' ? 'roi7d' :
                 filters.timeframe === '30d' ? 'roi30d' :
                 filters.timeframe === '90d' ? 'roi90d' : 'roiAllTime';
  
  filtered = filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'roi':
        return b[roiKey] - a[roiKey];
      case 'volume': {
        const volumeKey =
          filters.timeframe === '7d'
            ? 'volume7d'
            : filters.timeframe === '30d'
              ? 'volume30d'
              : filters.timeframe === '90d'
                ? 'volume90d'
                : 'volume';
        return b[volumeKey] - a[volumeKey];
      }
      case 'sharpe':
        return b.sharpeRatio - a.sharpeRatio;
      case 'winRate':
        return b.winRate - a.winRate;
      case 'trades':
        return b[tradesKey] - a[tradesKey];
      default:
        return 0;
    }
  });

  // Re-assign ranks
  return filtered.map((t, i) => ({ ...t, rank: i + 1 }));
}
