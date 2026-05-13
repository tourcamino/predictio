import { Market } from './mockMarkets';

export interface AdminMarket extends Market {
  marketId: number;
  createdAt: Date;
  resolvedAt?: Date;
  resolutionSource?: string;
  cancelledReason?: string;
  adminStatus: 'open' | 'closing-soon' | 'resolved' | 'cancelled';
}

export interface AdminUser {
  address: string;
  firstSeen: Date;
  lastActive: Date;
  predictions: number;
  volume: number;
  pnl: number;
  winRate: number;
  status: 'active' | 'review' | 'suspended';
  riskFlags: string[];
  riskScore: number; // 0-100
  isFlagged: boolean;
  isFrozen: boolean;
}

export interface ActivityFeedItem {
  id: string;
  type: 'prediction' | 'resolution' | 'new-user' | 'market-created' | 'large-bet';
  timestamp: Date;
  message: string;
  address?: string;
  amount?: number;
  market?: string;
}

export interface KPIData {
  activeMarkets: number;
  activeMarketsChange: number;
  volume24h: number;
  volume24hChange: number;
  totalUsers: number;
  totalUsersChange: number;
  platformRevenue: number;
  platformRevenueChange: number;
}

export interface AnalyticsData {
  volumeByDay: { date: string; volume: number; predictions: number }[];
  sportDistribution: { sport: string; percentage: number; color: string }[];
  revenueByDay: { date: string; revenue: number }[];
  conversionFunnel: {
    visitors: number;
    walletConnected: number;
    firstPrediction: number;
    repeatUser: number;
    powerUser: number;
  };
  topCountries: { country: string; flag: string; volume: number }[];
  sportPerformance: {
    sport: string;
    markets: number;
    volume: number;
    avgMarketSize: number;
    resolutionRate: number;
    revenue: number;
  }[];
}

export interface DisputedMarket {
  id: string;
  name: string;
  status: 'under_review' | 'voided';
  since: string;
  tradersAffected: number;
  volume: number;
  oracleStatus: string;
  reason: string;
  adminNote?: string;
  signatures: {
    admin1: boolean;
    admin2: boolean;
    admin3: boolean;
  };
}

export interface Anomaly {
  id: number;
  type: 'WASH_TRADING' | 'PRICE_MANIPULATION' | 'COORDINATED_TRADING' | 'UNUSUAL_VOLUME' | 'SYBIL_PATTERN';
  severity: 'critical' | 'warning';
  wallet?: string;
  market?: string;
  detail: string;
  volume: number;
  detectedAt: string;
  status: 'open' | 'reviewed' | 'dismissed' | 'whitelisted';
}

export const mockKPIData: KPIData = {
  activeMarkets: 847,
  activeMarketsChange: 12,
  volume24h: 4200000,
  volume24hChange: 18,
  totalUsers: 12847,
  totalUsersChange: 234,
  platformRevenue: 33600,
  platformRevenueChange: 2800,
};

export const mockFeeRevenue = {
  today: 284.50,
  week: 1847.20,
  month: 6204.80,
  avgFeeRate: 0.0094,
  marketOrdersPct: 0.82,
  limitOrdersPct: 0.18,
  treasurySplit: 0.70,
  analystSplit: 0.30,
  treasuryAmount: 4343.36,
  analystPoolAmount: 1861.44,
  totalTransactions: 3847,
};

const activityTypes: ActivityFeedItem['type'][] = [
  'prediction',
  'resolution',
  'new-user',
  'market-created',
  'large-bet',
];

const mockMessages = {
  prediction: [
    'New prediction: {address} · Real Madrid Win · ${amount} USDC',
    'New prediction: {address} · Lakers Win · ${amount} USDC',
    'New prediction: {address} · Djokovic Win · ${amount} USDC',
  ],
  resolution: [
    'Market resolved: UFC 310 · Poirier Win · 234 payouts sent',
    'Market resolved: Champions League · Real Madrid Win · 1,847 payouts sent',
    'Market resolved: NBA · Lakers Win · 892 payouts sent',
  ],
  'new-user': [
    'New user: {address} · first prediction ${amount}',
    'New user: {address} · connected wallet',
  ],
  'market-created': [
    'Market created: NBA · Lakers vs Celtics · auto-generated',
    'Market created: UFC 311 · Jones vs Miocic · manual',
    'Market created: Tennis · Wimbledon Final · auto-generated',
  ],
  'large-bet': [
    'Large bet alert: {address} · ${amount} USDC · Barcelona Win ⚠️',
    'Large bet alert: {address} · ${amount} USDC · Celtics Win ⚠️',
  ],
};

function randomAddress(): string {
  const chars = '0123456789abcdef';
  let addr = '0x';
  for (let i = 0; i < 4; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  addr += '...';
  for (let i = 0; i < 4; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

export function generateActivityItem(): ActivityFeedItem {
  const type =
    activityTypes[Math.floor(Math.random() * activityTypes.length)] ?? 'prediction';
  const messages = mockMessages[type];
  const pool = messages ?? mockMessages.prediction;
  const tpl = pool[Math.floor(Math.random() * pool.length)] ?? pool[0] ?? 'Activity';
  let message = tpl;
  
  const address = randomAddress();
  const amount = type === 'large-bet' 
    ? Math.floor(Math.random() * 5000) + 1000
    : Math.floor(Math.random() * 500) + 50;
  
  message = message.replace('{address}', address).replace('${amount}', amount.toString());
  
  return {
    id: Math.random().toString(36).substring(7),
    type,
    timestamp: new Date(),
    message,
    address: type === 'prediction' || type === 'new-user' || type === 'large-bet' ? address : undefined,
    amount: type === 'prediction' || type === 'new-user' || type === 'large-bet' ? amount : undefined,
  };
}

export const initialActivityFeed: ActivityFeedItem[] = Array.from({ length: 20 }, () => {
  const item = generateActivityItem();
  const secondsAgo = Math.floor(Math.random() * 300);
  item.timestamp = new Date(Date.now() - secondsAgo * 1000);
  return item;
}).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

export const mockUsers: AdminUser[] = [
  {
    address: '0x7f3a8b2c4e2b9f1a6d5c8e7f9a2b4c6d8e0f1a3b',
    firstSeen: new Date('2025-01-15'),
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
    predictions: 47,
    volume: 12400,
    pnl: 2847,
    winRate: 64.3,
    status: 'active',
    riskFlags: [],
    riskScore: 15,
    isFlagged: false,
    isFrozen: false,
  },
  {
    address: '0x2c1d9f7a3b8e4c6d8e0f1a3b5c7e9f1a2b4c6d8e',
    firstSeen: new Date('2025-03-02'),
    lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000),
    predictions: 12,
    volume: 3200,
    pnl: -400,
    winRate: 41.7,
    status: 'active',
    riskFlags: [],
    riskScore: 8,
    isFlagged: false,
    isFrozen: false,
  },
  {
    address: '0x9b1c2e7f4a8d6c9e1f3a5b7d9e1f2a4b6c8d0e2f',
    firstSeen: new Date('2025-04-01'),
    lastActive: new Date(Date.now() - 5 * 60 * 1000),
    predictions: 23,
    volume: 50000,
    pnl: 8000,
    winRate: 91.3,
    status: 'review',
    riskFlags: ['Unusually high win rate: 91.3% over 23 predictions', '$50,000 single bet detected'],
    riskScore: 94,
    isFlagged: true,
    isFrozen: false,
  },
  {
    address: '0x4f2a8b6c9d1e3f5a7b9d1e3f4a6b8c0d2e4f6a8b',
    firstSeen: new Date('2025-02-20'),
    lastActive: new Date(Date.now() - 12 * 60 * 60 * 1000),
    predictions: 89,
    volume: 24500,
    pnl: 4200,
    winRate: 58.4,
    status: 'active',
    riskFlags: [],
    riskScore: 22,
    isFlagged: false,
    isFrozen: false,
  },
  {
    address: '0x8b4e6a9c1d3e5f7a9b1d3e5f6a8b0c2d4e6f8a0b',
    firstSeen: new Date('2025-03-15'),
    lastActive: new Date(Date.now() - 30 * 60 * 1000),
    predictions: 47,
    volume: 8900,
    pnl: 1200,
    winRate: 55.3,
    status: 'review',
    riskFlags: ['47 predictions in 2 hours (bot pattern?)'],
    riskScore: 67,
    isFlagged: true,
    isFrozen: false,
  },
  {
    address: '0x7f3a...b291',
    firstSeen: new Date('2025-04-10'),
    lastActive: new Date(Date.now() - 15 * 60 * 1000),
    predictions: 14,
    volume: 3200,
    pnl: 87,
    winRate: 57.1,
    status: 'review',
    riskFlags: ['Wash trading detected: 7 round-trips'],
    riskScore: 94,
    isFlagged: true,
    isFrozen: true,
  },
];

export const mockAnalytics: AnalyticsData = {
  volumeByDay: [
    { date: 'Apr 1', volume: 3800000, predictions: 8234 },
    { date: 'Apr 2', volume: 3200000, predictions: 7123 },
    { date: 'Apr 3', volume: 3600000, predictions: 7891 },
    { date: 'Apr 4', volume: 4100000, predictions: 9234 },
    { date: 'Apr 5', volume: 3900000, predictions: 8567 },
    { date: 'Apr 6', volume: 4300000, predictions: 9876 },
    { date: 'Apr 7', volume: 3700000, predictions: 8123 },
    { date: 'Apr 8', volume: 4000000, predictions: 8934 },
    { date: 'Apr 9', volume: 4200000, predictions: 9234 },
    { date: 'Apr 10', volume: 3500000, predictions: 7654 },
    { date: 'Apr 11', volume: 3800000, predictions: 8345 },
    { date: 'Apr 12', volume: 4100000, predictions: 9123 },
    { date: 'Apr 13', volume: 4400000, predictions: 9876 },
    { date: 'Apr 14', volume: 4200000, predictions: 9456 },
  ],
  sportDistribution: [
    { sport: 'Football', percentage: 35, color: '#00FF87' },
    { sport: 'Basketball', percentage: 22, color: '#FF6B35' },
    { sport: 'Cricket', percentage: 18, color: '#3580FF' },
    { sport: 'MMA', percentage: 12, color: '#FF3535' },
    { sport: 'Tennis', percentage: 8, color: '#FFE135' },
    { sport: 'Other', percentage: 5, color: '#9B35FF' },
  ],
  revenueByDay: [
    { date: 'Apr 1', revenue: 30400 },
    { date: 'Apr 2', revenue: 25600 },
    { date: 'Apr 3', revenue: 28800 },
    { date: 'Apr 4', revenue: 32800 },
    { date: 'Apr 5', revenue: 31200 },
    { date: 'Apr 6', revenue: 34400 },
    { date: 'Apr 7', revenue: 29600 },
    { date: 'Apr 8', revenue: 32000 },
    { date: 'Apr 9', revenue: 33600 },
    { date: 'Apr 10', revenue: 28000 },
    { date: 'Apr 11', revenue: 30400 },
    { date: 'Apr 12', revenue: 32800 },
    { date: 'Apr 13', revenue: 35200 },
    { date: 'Apr 14', revenue: 33600 },
  ],
  conversionFunnel: {
    visitors: 12400,
    walletConnected: 3847,
    firstPrediction: 1241,
    repeatUser: 623,
    powerUser: 234,
  },
  topCountries: [
    { country: 'Nigeria', flag: '🇳🇬', volume: 1240000 },
    { country: 'Brazil', flag: '🇧🇷', volume: 980000 },
    { country: 'India', flag: '🇮🇳', volume: 876000 },
    { country: 'Germany', flag: '🇩🇪', volume: 654000 },
    { country: 'UK', flag: '🇬🇧', volume: 543000 },
    { country: 'Philippines', flag: '🇵🇭', volume: 432000 },
  ],
  sportPerformance: [
    { sport: 'Football', markets: 342, volume: 1470000, avgMarketSize: 4298, resolutionRate: 98.2, revenue: 11760 },
    { sport: 'Basketball', markets: 198, volume: 924000, avgMarketSize: 4666, resolutionRate: 97.5, revenue: 7392 },
    { sport: 'Cricket', markets: 145, volume: 756000, avgMarketSize: 5213, resolutionRate: 96.8, revenue: 6048 },
    { sport: 'MMA', markets: 87, volume: 504000, avgMarketSize: 5793, resolutionRate: 99.1, revenue: 4032 },
    { sport: 'Tennis', markets: 56, volume: 336000, avgMarketSize: 6000, resolutionRate: 95.2, revenue: 2688 },
    { sport: 'Other', markets: 19, volume: 210000, avgMarketSize: 11052, resolutionRate: 94.7, revenue: 1680 },
  ],
};

export const mockDisputedMarkets: DisputedMarket[] = [
  {
    id: 'market-1',
    name: 'Real Madrid to win UCL Final',
    status: 'under_review',
    since: '2h ago',
    tradersAffected: 124,
    volume: 48200,
    oracleStatus: 'TIMEOUT (no data)',
    reason: 'Match suspended',
    adminNote: '',
    signatures: {
      admin1: true,
      admin2: false,
      admin3: false,
    },
  },
  {
    id: 'market-23',
    name: 'NBA Finals Game 3',
    status: 'under_review',
    since: '45m ago',
    tradersAffected: 89,
    volume: 32100,
    oracleStatus: 'AMBIGUOUS',
    reason: 'Oracle timeout',
    adminNote: '',
    signatures: {
      admin1: false,
      admin2: false,
      admin3: false,
    },
  },
];

export const mockAnomalies: Anomaly[] = [
  {
    id: 1,
    type: 'WASH_TRADING',
    severity: 'critical',
    wallet: '0x7f3a...b291',
    market: 'Real Madrid UCL',
    detail: '7 round-trips in 45 min',
    volume: 3200,
    detectedAt: '12 min ago',
    status: 'open',
  },
  {
    id: 2,
    type: 'UNUSUAL_VOLUME',
    severity: 'warning',
    market: 'NBA Finals Game 3',
    detail: '+340% volume spike in 52 min',
    volume: 8900,
    detectedAt: '28 min ago',
    status: 'open',
  },
  {
    id: 3,
    type: 'SYBIL_PATTERN',
    severity: 'warning',
    wallet: '0x2c91...ff04',
    market: 'Man City vs Arsenal',
    detail: 'New wallet, $6,200 single market',
    volume: 6200,
    detectedAt: '1h ago',
    status: 'open',
  },
  {
    id: 4,
    type: 'COORDINATED_TRADING',
    severity: 'warning',
    market: 'Lakers vs Celtics',
    detail: '3 wallets, identical pattern <20s',
    volume: 4800,
    detectedAt: '2h ago',
    status: 'open',
  },
  {
    id: 5,
    type: 'PRICE_MANIPULATION',
    severity: 'critical',
    wallet: '0x9a2f...c381',
    market: 'UFC 310',
    detail: 'Single trade moved price 8.2%',
    volume: 12000,
    detectedAt: '3h ago',
    status: 'open',
  },
];
