// TODO CURSOR C1: Replace all mock data with real API calls
// This file contains realistic mock data to populate the platform
// All data should eventually be replaced with real backend queries

/**
 * Mock Trader Profile
 * Represents a trader who can be copied
 */
export interface MockTrader {
  wallet: string;
  winRate: number;
  totalVolume: number;
  totalTrades: number;
  winningTrades: number;
  activeCopiers: number;
  analystRewards: number;
  memberSince: string;
  activePositions: number;
  topSport: string;
  totalPnl?: number;
  roi?: number;
}

/**
 * Mock Market
 * Simplified market structure for the copy trading page
 */
export interface MockMarket {
  id: string;
  name: string;
  competition: string;
  sport: string;
  status: 'open' | 'locked' | 'resolved';
  start_time: number;
  yes_price: number;
  no_price: number;
  volume: number;
  liquidity: number;
  question: string;
  result?: 'yes' | 'no';
  resolved_at?: number;
}

/**
 * Mock Open Trade
 * Represents an active position by a trader
 */
export interface MockOpenTrade {
  id: string;
  trader: string;
  market: string;
  direction: 'YES' | 'NO';
  amount: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  pnl_pct: number;
  opened_at: number;
}

/**
 * Mock Vault Stats
 * Protocol vault statistics
 */
export interface MockVaultStats {
  tvl: number;
  totalVolume: number;
  totalFees: number;
  lpRewards: number;
  activeLPs: number;
  myDeposit: number;
  myShare: number;
  myRewards: number;
  dailyVolume: number;
  dailyFees: number;
  dailyLpRewards: number;
}

/**
 * Mock Platform Stats
 * Overall platform statistics for social proof
 */
export interface MockPlatformStats {
  totalVolume: number;
  activeMarkets: number;
  activeTraders: number;
  totalCopiers: number;
  totalPayouts: number;
  marketsResolved: number;
}

// TODO CURSOR C1: replace with real API call to /api/traders
export const mockTraders: MockTrader[] = [
  {
    wallet: "0x3f4a...8c2d",
    winRate: 71,
    totalVolume: 48200,
    totalTrades: 89,
    winningTrades: 63,
    activeCopiers: 24,
    analystRewards: 1840,
    memberSince: "2024-11-01",
    activePositions: 3,
    topSport: "football"
  },
  {
    wallet: "0x7b2e...1f9a",
    winRate: 68,
    totalVolume: 31500,
    totalTrades: 54,
    winningTrades: 37,
    activeCopiers: 18,
    analystRewards: 1102,
    memberSince: "2024-11-15",
    activePositions: 2,
    topSport: "basketball"
  },
  {
    wallet: "0x9d1c...4e7b",
    winRate: 65,
    totalVolume: 22800,
    totalTrades: 41,
    winningTrades: 27,
    activeCopiers: 12,
    analystRewards: 798,
    memberSince: "2024-12-01",
    activePositions: 4,
    topSport: "football"
  },
  {
    wallet: "0x2a8f...7c3e",
    winRate: 74,
    totalVolume: 67300,
    totalTrades: 112,
    winningTrades: 83,
    activeCopiers: 41,
    analystRewards: 2355,
    memberSince: "2024-10-20",
    activePositions: 2,
    topSport: "mma"
  },
  {
    wallet: "0x5e3d...9a1f",
    winRate: 61,
    totalVolume: 14200,
    totalTrades: 28,
    winningTrades: 17,
    activeCopiers: 7,
    analystRewards: 497,
    memberSince: "2024-12-10",
    activePositions: 1,
    topSport: "football"
  },
  {
    wallet: "0x8c7b...2d4a",
    winRate: 78,
    totalVolume: 89500,
    totalTrades: 143,
    winningTrades: 112,
    activeCopiers: 67,
    analystRewards: 3132,
    memberSince: "2024-10-05",
    activePositions: 5,
    topSport: "football"
  },
  {
    wallet: "0x1d9e...6f2c",
    winRate: 63,
    totalVolume: 19300,
    totalTrades: 35,
    winningTrades: 22,
    activeCopiers: 9,
    analystRewards: 675,
    memberSince: "2024-12-05",
    activePositions: 2,
    topSport: "basketball"
  },
  {
    wallet: "0x4f6a...3b8e",
    winRate: 69,
    totalVolume: 38700,
    totalTrades: 71,
    winningTrades: 49,
    activeCopiers: 29,
    analystRewards: 1354,
    memberSince: "2024-11-08",
    activePositions: 3,
    topSport: "football"
  },
  {
    wallet: "0x6b2c...5e9d",
    winRate: 72,
    totalVolume: 52100,
    totalTrades: 96,
    winningTrades: 69,
    activeCopiers: 38,
    analystRewards: 1823,
    memberSince: "2024-10-28",
    activePositions: 1,
    topSport: "mma"
  },
  {
    wallet: "0x0e5f...8a3c",
    winRate: 66,
    totalVolume: 27400,
    totalTrades: 48,
    winningTrades: 32,
    activeCopiers: 15,
    analystRewards: 959,
    memberSince: "2024-11-22",
    activePositions: 2,
    topSport: "football"
  }
];

// TODO CURSOR C1: replace with real API call to /api/markets
export const mockMarkets: MockMarket[] = [
  // OPEN — kickoff in next few hours
  {
    id: "ucl-inter-barca",
    name: "Inter vs Barcelona",
    competition: "UEFA Champions League",
    sport: "football",
    status: "open",
    start_time: Date.now() + 2 * 60 * 60 * 1000,
    yes_price: 0.62,
    no_price: 0.38,
    volume: 45230,
    liquidity: 12800,
    question: "Will Inter win?"
  },
  {
    id: "nba-lakers-celtics",
    name: "Lakers vs Celtics",
    competition: "NBA Regular Season",
    sport: "basketball",
    status: "open",
    start_time: Date.now() + 5 * 60 * 60 * 1000,
    yes_price: 0.44,
    no_price: 0.56,
    volume: 28900,
    liquidity: 8200,
    question: "Will Lakers win?"
  },
  {
    id: "seriea-milan-juve",
    name: "AC Milan vs Juventus",
    competition: "Serie A",
    sport: "football",
    status: "open",
    start_time: Date.now() + 24 * 60 * 60 * 1000,
    yes_price: 0.51,
    no_price: 0.49,
    volume: 31200,
    liquidity: 9400,
    question: "Will Milan win?"
  },
  {
    id: "mma-ufc-310",
    name: "Pereira vs Ankalaev",
    competition: "UFC 310",
    sport: "mma",
    status: "open",
    start_time: Date.now() + 48 * 60 * 60 * 1000,
    yes_price: 0.67,
    no_price: 0.33,
    volume: 19800,
    liquidity: 5600,
    question: "Will Pereira retain?"
  },

  // LOCKED — match in progress
  {
    id: "ucl-real-city",
    name: "Real Madrid vs Man City",
    competition: "UEFA Champions League",
    sport: "football",
    status: "locked",
    start_time: Date.now() - 45 * 60 * 1000,
    yes_price: 0.58,
    no_price: 0.42,
    volume: 67800,
    liquidity: 0,
    question: "Will Real Madrid win?"
  },
  {
    id: "nba-warriors-bulls",
    name: "Warriors vs Bulls",
    competition: "NBA Regular Season",
    sport: "basketball",
    status: "locked",
    start_time: Date.now() - 30 * 60 * 1000,
    yes_price: 0.71,
    no_price: 0.29,
    volume: 22100,
    liquidity: 0,
    question: "Will Warriors win?"
  },
  {
    id: "pl-arsenal-chelsea",
    name: "Arsenal vs Chelsea",
    competition: "Premier League",
    sport: "football",
    status: "locked",
    start_time: Date.now() - 60 * 60 * 1000,
    yes_price: 0.55,
    no_price: 0.45,
    volume: 41500,
    liquidity: 0,
    question: "Will Arsenal win?"
  },
  {
    id: "tennis-djokovic-alcaraz",
    name: "Djokovic vs Alcaraz",
    competition: "Roland Garros SF",
    sport: "tennis",
    status: "locked",
    start_time: Date.now() - 90 * 60 * 1000,
    yes_price: 0.48,
    no_price: 0.52,
    volume: 15300,
    liquidity: 0,
    question: "Will Djokovic win?"
  },

  // RESOLVED
  {
    id: "ucl-psg-dortmund",
    name: "PSG vs Dortmund",
    competition: "UEFA Champions League",
    sport: "football",
    status: "resolved",
    result: "yes",
    start_time: Date.now() - 3 * 60 * 60 * 1000,
    resolved_at: Date.now() - 60 * 60 * 1000,
    yes_price: 1.0,
    no_price: 0.0,
    volume: 53200,
    liquidity: 0,
    question: "Will PSG win?"
  },
  {
    id: "nba-heat-bucks",
    name: "Heat vs Bucks",
    competition: "NBA Regular Season",
    sport: "basketball",
    status: "resolved",
    result: "no",
    start_time: Date.now() - 5 * 60 * 60 * 1000,
    resolved_at: Date.now() - 2 * 60 * 60 * 1000,
    yes_price: 0.0,
    no_price: 1.0,
    volume: 18700,
    liquidity: 0,
    question: "Will Heat win?"
  },
  {
    id: "seriea-napoli-roma",
    name: "Napoli vs Roma",
    competition: "Serie A",
    sport: "football",
    status: "resolved",
    result: "yes",
    start_time: Date.now() - 4 * 60 * 60 * 1000,
    resolved_at: Date.now() - 90 * 60 * 1000,
    yes_price: 1.0,
    no_price: 0.0,
    volume: 29800,
    liquidity: 0,
    question: "Will Napoli win?"
  },
  {
    id: "mma-ufc-309",
    name: "Jones vs Miocic",
    competition: "UFC 309",
    sport: "mma",
    status: "resolved",
    result: "yes",
    start_time: Date.now() - 6 * 60 * 60 * 1000,
    resolved_at: Date.now() - 3 * 60 * 60 * 1000,
    yes_price: 1.0,
    no_price: 0.0,
    volume: 44100,
    liquidity: 0,
    question: "Will Jones win?"
  }
];

// TODO CURSOR C1: replace with real API call to /api/trades/open
export const mockOpenTrades: MockOpenTrade[] = [
  {
    id: "trade-001",
    trader: "0x3f4a...8c2d",
    market: "ucl-inter-barca",
    direction: "YES",
    amount: 500,
    entry_price: 0.60,
    current_price: 0.62,
    pnl: +10,
    pnl_pct: +3.3,
    opened_at: Date.now() - 2 * 60 * 60 * 1000
  },
  {
    id: "trade-002",
    trader: "0x8c7b...2d4a",
    market: "ucl-inter-barca",
    direction: "NO",
    amount: 800,
    entry_price: 0.40,
    current_price: 0.38,
    pnl: +16,
    pnl_pct: +5.2,
    opened_at: Date.now() - 3 * 60 * 60 * 1000
  },
  {
    id: "trade-003",
    trader: "0x2a8f...7c3e",
    market: "nba-lakers-celtics",
    direction: "YES",
    amount: 1200,
    entry_price: 0.42,
    current_price: 0.44,
    pnl: +24,
    pnl_pct: +4.7,
    opened_at: Date.now() - 1 * 60 * 60 * 1000
  },
  {
    id: "trade-004",
    trader: "0x4f6a...3b8e",
    market: "seriea-milan-juve",
    direction: "YES",
    amount: 600,
    entry_price: 0.50,
    current_price: 0.51,
    pnl: +6,
    pnl_pct: +2.0,
    opened_at: Date.now() - 4 * 60 * 60 * 1000
  },
  {
    id: "trade-005",
    trader: "0x6b2c...5e9d",
    market: "mma-ufc-310",
    direction: "YES",
    amount: 350,
    entry_price: 0.65,
    current_price: 0.67,
    pnl: +7,
    pnl_pct: +3.0,
    opened_at: Date.now() - 6 * 60 * 60 * 1000
  },
  {
    id: "trade-006",
    trader: "0x3f4a...8c2d",
    market: "nba-lakers-celtics",
    direction: "NO",
    amount: 400,
    entry_price: 0.57,
    current_price: 0.56,
    pnl: +4,
    pnl_pct: +1.7,
    opened_at: Date.now() - 5 * 60 * 60 * 1000
  },
  {
    id: "trade-007",
    trader: "0x8c7b...2d4a",
    market: "seriea-milan-juve",
    direction: "NO",
    amount: 900,
    entry_price: 0.51,
    current_price: 0.49,
    pnl: +18,
    pnl_pct: +3.9,
    opened_at: Date.now() - 2 * 60 * 60 * 1000
  },
  {
    id: "trade-008",
    trader: "0x7b2e...1f9a",
    market: "mma-ufc-310",
    direction: "NO",
    amount: 250,
    entry_price: 0.35,
    current_price: 0.33,
    pnl: +5,
    pnl_pct: +5.7,
    opened_at: Date.now() - 8 * 60 * 60 * 1000
  },
  {
    id: "trade-009",
    trader: "0x9d1c...4e7b",
    market: "ucl-inter-barca",
    direction: "YES",
    amount: 700,
    entry_price: 0.59,
    current_price: 0.62,
    pnl: +21,
    pnl_pct: +5.0,
    opened_at: Date.now() - 7 * 60 * 60 * 1000
  },
  {
    id: "trade-010",
    trader: "0x2a8f...7c3e",
    market: "seriea-milan-juve",
    direction: "YES",
    amount: 1500,
    entry_price: 0.49,
    current_price: 0.51,
    pnl: +30,
    pnl_pct: +4.0,
    opened_at: Date.now() - 3 * 60 * 60 * 1000
  },
  {
    id: "trade-011",
    trader: "0x5e3d...9a1f",
    market: "nba-lakers-celtics",
    direction: "YES",
    amount: 200,
    entry_price: 0.43,
    current_price: 0.44,
    pnl: +2,
    pnl_pct: +2.3,
    opened_at: Date.now() - 1 * 60 * 60 * 1000
  },
  {
    id: "trade-012",
    trader: "0x0e5f...8a3c",
    market: "mma-ufc-310",
    direction: "YES",
    amount: 450,
    entry_price: 0.64,
    current_price: 0.67,
    pnl: +13,
    pnl_pct: +4.6,
    opened_at: Date.now() - 9 * 60 * 60 * 1000
  },
  {
    id: "trade-013",
    trader: "0x1d9e...6f2c",
    market: "ucl-inter-barca",
    direction: "NO",
    amount: 300,
    entry_price: 0.41,
    current_price: 0.38,
    pnl: +9,
    pnl_pct: +7.3,
    opened_at: Date.now() - 4 * 60 * 60 * 1000
  },
  {
    id: "trade-014",
    trader: "0x4f6a...3b8e",
    market: "nba-lakers-celtics",
    direction: "NO",
    amount: 550,
    entry_price: 0.57,
    current_price: 0.56,
    pnl: +5,
    pnl_pct: +1.7,
    opened_at: Date.now() - 2 * 60 * 60 * 1000
  },
  {
    id: "trade-015",
    trader: "0x6b2c...5e9d",
    market: "seriea-milan-juve",
    direction: "YES",
    amount: 800,
    entry_price: 0.48,
    current_price: 0.51,
    pnl: +24,
    pnl_pct: +6.2,
    opened_at: Date.now() - 6 * 60 * 60 * 1000
  }
];

// TODO CURSOR C1: replace with real API call to /api/vault/stats
export const mockVaultStats: MockVaultStats = {
  tvl: 48500,
  totalVolume: 892000,
  totalFees: 8920,
  lpRewards: 4460,
  activeLPs: 12,
  myDeposit: 0,
  myShare: 0,
  myRewards: 0,
  dailyVolume: 34200,
  dailyFees: 342,
  dailyLpRewards: 171
};

// TODO CURSOR C1: replace with real API call to /api/platform/stats
export const mockPlatformStats: MockPlatformStats = {
  totalVolume: 892000,
  activeMarkets: 12,
  activeTraders: 847,
  totalCopiers: 312,
  totalPayouts: 24800,
  marketsResolved: 156
};

/**
 * Get trader by wallet address
 */
export function getTraderByWallet(wallet: string): MockTrader | undefined {
  return mockTraders.find(t => t.wallet === wallet);
}

/** Match mock trader by exact wallet or by abbreviated form `0xabcd...ef12` vs full address. */
export function resolveMockTrader(walletParam: string): MockTrader | undefined {
  const raw = walletParam.trim();
  const direct = getTraderByWallet(raw);
  if (direct) return direct;
  const lower = raw.toLowerCase();
  return mockTraders.find((t) => {
    const w = t.wallet;
    if (w.toLowerCase() === lower) return true;
    const parts = w.split("...");
    if (parts.length === 2) {
      const [a, b] = [parts[0]!.toLowerCase(), parts[1]!.toLowerCase()];
      return lower.startsWith(a) && lower.endsWith(b);
    }
    return false;
  });
}

/**
 * Get open trades for a specific trader
 */
export function getTraderOpenTrades(wallet: string): MockOpenTrade[] {
  return mockOpenTrades.filter(t => t.trader === wallet);
}

/**
 * Get market by ID
 */
export function getMarketById(id: string): MockMarket | undefined {
  return mockMarkets.find(m => m.id === id);
}

/**
 * Get traders sorted by active copiers (for leaderboard)
 */
export function getTopTraders(limit: number = 10): MockTrader[] {
  return [...mockTraders]
    .sort((a, b) => b.activeCopiers - a.activeCopiers)
    .slice(0, limit);
}

/**
 * Get open markets only
 */
export function getOpenMarkets(): MockMarket[] {
  return mockMarkets.filter(m => m.status === 'open');
}
