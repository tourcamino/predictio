export interface DemoPosition {
  marketId: string;
  marketTitle: string;
  outcome: 'YES' | 'NO';
  shares: number;
  avgPrice: number;
  currentPrice: number;
  openedAt: number;
}

export interface DemoTrade {
  id: string;
  marketId: string;
  type: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  shares: number;
  price: number;
  total: number;
  timestamp: number;
}

export interface DemoState {
  active: boolean;
  balance: number;
  positions: DemoPosition[];
  tradeHistory: DemoTrade[];
  createdAt: number;
  totalPnL: number;
}

const DEMO_STATE_KEY = 'predictio_demo_state';
const INITIAL_BALANCE = 1000;

function createInitialDemoState(): DemoState {
  return {
    active: true, // Demo mode is now always active by default
    balance: INITIAL_BALANCE,
    positions: [],
    tradeHistory: [],
    createdAt: Date.now(),
    totalPnL: 0,
  };
}

export function getDemoState(): DemoState {
  const stored = localStorage.getItem(DEMO_STATE_KEY);
  if (!stored) {
    return createInitialDemoState();
  }
  
  try {
    return JSON.parse(stored) as DemoState;
  } catch (error) {
    console.error('Failed to parse demo state:', error);
    return createInitialDemoState();
  }
}

export function saveDemoState(state: DemoState): void {
  try {
    localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save demo state:', error);
  }
}

export function resetDemoAccount(): DemoState {
  const newState = createInitialDemoState();
  newState.active = true; // Ensure demo mode stays active after reset
  saveDemoState(newState);
  return newState;
}

export function activateDemoMode(): DemoState {
  const state = getDemoState();
  state.active = true;
  saveDemoState(state);
  return state;
}

export function deactivateDemoMode(): DemoState {
  // Demo mode is now permanent - this function no longer deactivates
  // Just return the current state to maintain compatibility
  const state = getDemoState();
  state.active = true;
  saveDemoState(state);
  return state;
}

export function updateDemoPosition(marketId: string, currentPrice: number): void {
  const state = getDemoState();
  const position = state.positions.find(p => p.marketId === marketId);
  if (position) {
    position.currentPrice = currentPrice;
    saveDemoState(state);
  }
}

export function calculateDemoStats(state: DemoState): {
  totalTrades: number;
  winRate: number;
  bestTrade: DemoTrade | null;
  worstTrade: DemoTrade | null;
  totalPnL: number;
} {
  const trades = state.tradeHistory;
  const totalTrades = trades.length;
  
  // Calculate P&L for each trade
  const tradesWithPnL = trades.map(trade => {
    // For simplicity, calculate P&L based on buy/sell
    // In a real implementation, this would be more sophisticated
    return trade;
  });
  
  // Find best and worst trades
  let bestTrade: DemoTrade | null = null;
  let worstTrade: DemoTrade | null = null;
  
  if (trades.length > 0) {
    bestTrade = trades[0];
    worstTrade = trades[0];
  }
  
  return {
    totalTrades,
    winRate: 0, // Will be calculated based on resolved positions
    bestTrade,
    worstTrade,
    totalPnL: state.totalPnL,
  };
}
