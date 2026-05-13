export interface LPMarket {
  id: string;
  name: string;
  sport: string;
  sportEmoji: string;
  league: string;
  poolSize: number;
  apy: number;
  volume24h: number;
  risk: 'low' | 'medium' | 'high';
  myShare: number | null;
  myDeposit: number | null;
  myValue: number | null;
  feesEarned: number | null;
  feesPending: number | null;
  closesAt: Date;
  status: 'open' | 'closed';
}

export interface LPPosition {
  id: string;
  marketId: string;
  marketName: string;
  sport: string;
  sportEmoji: string;
  league: string;
  deposited: number;
  currentValue: number;
  poolShare: number;
  feesEarned: number;
  feesPending: number;
  apy: number;
  openSince: Date;
  status: 'active' | 'withdrawn';
  feeHistory: Array<{
    date: string;
    amount: number;
    cumulative: number;
  }>;
}

export interface LPSummary {
  totalLPs: number;
  totalDeposited: number;
  avgApy: number;
  feesDistributed30d: number;
  largestLP: number;
  concentrationRisk: 'low' | 'medium' | 'high';
}

export interface APYHistoryPoint {
  timestamp: Date;
  apy: number;
  poolSize: number;
  volume24h: number;
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function calculateRisk(poolSize: number, volume24h: number): 'low' | 'medium' | 'high' {
  if (poolSize > 50000 && volume24h > 5000) return 'low';
  if (poolSize > 10000) return 'medium';
  return 'high';
}

function calculateAPY(poolSize: number, volume24h: number, fee30d: number): number {
  if (poolSize === 0) return 0;
  // APY = (fee30d / totalPool) * 12 * 0.70 (LP gets 70% of fees, 30% goes to analysts)
  const monthlyReturn = (fee30d / poolSize) * 0.7;
  return monthlyReturn * 12 * 100;
}

// Mock LP Markets
export const mockLPMarkets: LPMarket[] = [
  {
    id: 'market-1',
    name: 'Real Madrid to win UCL',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'UEFA Champions League',
    poolSize: 48200,
    apy: 18.4,
    volume24h: 12450,
    risk: 'medium',
    myShare: 0.01034,
    myDeposit: 500,
    myValue: 512.40,
    feesEarned: 18.20,
    feesPending: 6.40,
    closesAt: hoursFromNow(2.25),
    status: 'open',
  },
  {
    id: 'market-2',
    name: 'Man City vs Arsenal · Over 2.5',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'Premier League',
    poolSize: 18700,
    apy: 11.2,
    volume24h: 3200,
    risk: 'medium',
    myShare: null,
    myDeposit: null,
    myValue: null,
    feesEarned: null,
    feesPending: null,
    closesAt: hoursFromNow(8.5),
    status: 'open',
  },
  {
    id: 'market-3',
    name: 'NBA Finals Game 3',
    sport: 'basketball',
    sportEmoji: '🏀',
    league: 'NBA Playoffs',
    poolSize: 3100,
    apy: 6.1,
    volume24h: 450,
    risk: 'high',
    myShare: null,
    myDeposit: null,
    myValue: null,
    feesEarned: null,
    feesPending: null,
    closesAt: hoursFromNow(4.5),
    status: 'open',
  },
  {
    id: 'market-4',
    name: 'Lakers vs Celtics',
    sport: 'basketball',
    sportEmoji: '🏀',
    league: 'NBA',
    poolSize: 67800,
    apy: 14.8,
    volume24h: 8900,
    risk: 'low',
    myShare: null,
    myDeposit: null,
    myValue: null,
    feesEarned: null,
    feesPending: null,
    closesAt: hoursFromNow(4.5),
    status: 'open',
  },
  {
    id: 'market-5',
    name: 'Max Verstappen Monaco GP',
    sport: 'f1',
    sportEmoji: '🏎️',
    league: 'Formula 1',
    poolSize: 156000,
    apy: 22.1,
    volume24h: 28400,
    risk: 'low',
    myShare: null,
    myDeposit: null,
    myValue: null,
    feesEarned: null,
    feesPending: null,
    closesAt: daysFromNow(2.58),
    status: 'open',
  },
  {
    id: 'market-6',
    name: 'Inter Milan vs AC Milan',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'Serie A',
    poolSize: 45600,
    apy: 16.3,
    volume24h: 6200,
    risk: 'medium',
    myShare: null,
    myDeposit: null,
    myValue: null,
    feesEarned: null,
    feesPending: null,
    closesAt: hoursFromNow(6),
    status: 'open',
  },
  {
    id: 'market-7',
    name: 'Djokovic vs Alcaraz Wimbledon',
    sport: 'tennis',
    sportEmoji: '🎾',
    league: 'Wimbledon',
    poolSize: 87600,
    apy: 19.7,
    volume24h: 14200,
    risk: 'low',
    myShare: null,
    myDeposit: null,
    myValue: null,
    feesEarned: null,
    feesPending: null,
    closesAt: hoursFromNow(15),
    status: 'open',
  },
  {
    id: 'market-8',
    name: 'Poirier vs Gaethje UFC',
    sport: 'mma',
    sportEmoji: '🥊',
    league: 'UFC 310',
    poolSize: 89200,
    apy: 20.4,
    volume24h: 15800,
    risk: 'low',
    myShare: null,
    myDeposit: null,
    myValue: null,
    feesEarned: null,
    feesPending: null,
    closesAt: daysFromNow(1.25),
    status: 'open',
  },
];

// Mock LP Summary
export const mockLPSummary: LPSummary = {
  totalLPs: 38,
  totalDeposited: 284500,
  avgApy: 14.2,
  feesDistributed30d: 4820,
  largestLP: 42000,
  concentrationRisk: 'medium',
};

// Mock User LP Positions
export const mockUserLPPositions: LPPosition[] = [
  {
    id: 'lp-pos-1',
    marketId: 'market-1',
    marketName: 'Real Madrid to win UCL',
    sport: 'football',
    sportEmoji: '⚽',
    league: 'UEFA Champions League',
    deposited: 500,
    currentValue: 512.40,
    poolShare: 0.01034,
    feesEarned: 18.20,
    feesPending: 6.40,
    apy: 17.8,
    openSince: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    status: 'active',
    feeHistory: [
      { date: 'Apr 28', amount: 1.24, cumulative: 18.20 },
      { date: 'Apr 27', amount: 1.18, cumulative: 16.96 },
      { date: 'Apr 26', amount: 0.94, cumulative: 15.78 },
      { date: 'Apr 25', amount: 1.32, cumulative: 14.84 },
      { date: 'Apr 24', amount: 1.45, cumulative: 13.52 },
      { date: 'Apr 23', amount: 1.28, cumulative: 12.07 },
      { date: 'Apr 22', amount: 0.89, cumulative: 10.79 },
    ],
  },
];

// Helper to get LP opportunities for a specific market
export function getLPMarketById(marketId: string): LPMarket | undefined {
  return mockLPMarkets.find(m => m.id === marketId);
}

// Helper to get user's LP positions
export function getUserLPPositions(walletAddress: string): LPPosition[] {
  // In production, this would filter by wallet address
  // For mock, return the mock positions if wallet is connected
  return walletAddress ? mockUserLPPositions : [];
}

// Helper to calculate concentration risk
export function calculateConcentrationRisk(largestLP: number, totalDeposited: number): 'low' | 'medium' | 'high' {
  const concentration = largestLP / totalDeposited;
  if (concentration > 0.3) return 'high';
  if (concentration > 0.15) return 'medium';
  return 'low';
}

/**
 * Generate mock APY history for a market
 * Creates realistic APY fluctuations over time
 */
export function generateMockAPYHistory(
  marketId: string,
  currentAPY: number,
  days: number = 30
): APYHistoryPoint[] {
  const history: APYHistoryPoint[] = [];
  const now = Date.now();
  
  // Start with a base APY slightly lower than current
  const baseAPY = currentAPY * 0.85;
  
  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(now - i * 24 * 60 * 60 * 1000);
    
    // Add some realistic variation
    const dayProgress = (days - i) / days;
    const trend = (currentAPY - baseAPY) * dayProgress;
    const volatility = Math.sin(i / 3) * (currentAPY * 0.08);
    const randomNoise = (Math.random() - 0.5) * (currentAPY * 0.05);
    
    let apy = baseAPY + trend + volatility + randomNoise;
    apy = Math.max(currentAPY * 0.5, Math.min(currentAPY * 1.3, apy));
    
    // Generate corresponding pool size and volume
    const poolSizeBase = 50000;
    const poolSize = poolSizeBase * (0.8 + dayProgress * 0.4) * (1 + (Math.random() - 0.5) * 0.1);
    const volume24h = poolSize * 0.15 * (1 + (Math.random() - 0.5) * 0.3);
    
    history.push({
      timestamp,
      apy: parseFloat(apy.toFixed(2)),
      poolSize: parseFloat(poolSize.toFixed(2)),
      volume24h: parseFloat(volume24h.toFixed(2)),
    });
  }
  
  // Ensure the last point matches the current APY
  const lastPoint = history[history.length - 1];
  if (lastPoint) {
    lastPoint.apy = currentAPY;
  }
  
  return history;
}

/**
 * Get APY history for a specific market
 */
export function getMarketAPYHistory(
  marketId: string,
  days: number = 30
): APYHistoryPoint[] {
  const market = mockLPMarkets.find(m => m.id === marketId);
  if (!market) return [];
  
  return generateMockAPYHistory(marketId, market.apy, days);
}
