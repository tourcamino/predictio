/**
 * Guest-only simulated prediction rows (localStorage). Not persisted as `Order` rows;
 * never mix with wallet-connected paper state. See `docs/DATA-MODEL-GLOSSARY.md`.
 */
export interface DemoPosition {
  marketId: string;
  marketTitle: string;
  outcome: 'YES' | 'NO' | 'DRAW';
  shares: number;
  avgPrice: number;
  currentPrice: number;
  openedAt: number;
}

export interface DemoTrade {
  id: string;
  marketId: string;
  type: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO' | 'DRAW';
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
const DEMO_OPT_IN_KEY = 'predictio_demo_opt_in';
const INITIAL_BALANCE = 1000;

function createInitialDemoState(): DemoState {
  return {
    // Demo mode must be explicitly enabled; without wallet connection we should not show a spendable balance.
    active: false,
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
    const parsed = JSON.parse(stored) as DemoState;
    // Backward-compat: older builds had demo "always on". For this phase, demo must be explicit opt-in.
    const optIn = localStorage.getItem(DEMO_OPT_IN_KEY) === 'true';
    if (!optIn && parsed.active) {
      parsed.active = false;
      saveDemoState(parsed);
    }
    return parsed;
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
  try {
    localStorage.removeItem(DEMO_OPT_IN_KEY);
  } catch {
    /* ignore */
  }
  const newState = createInitialDemoState();
  saveDemoState(newState);
  return newState;
}

export function activateDemoMode(): DemoState {
  try {
    // Must be set before `getDemoState()` — otherwise opt-in logic clears `active` on read.
    localStorage.setItem(DEMO_OPT_IN_KEY, "true");
  } catch {
    /* ignore private mode / quota */
  }
  const state = getDemoState();
  state.active = true;
  saveDemoState(state);
  return state;
}

export function deactivateDemoMode(): DemoState {
  try {
    localStorage.setItem(DEMO_OPT_IN_KEY, "false");
  } catch {
    /* ignore */
  }
  const state = getDemoState();
  state.active = false;
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
    bestTrade = trades[0] ?? null;
    worstTrade = trades[0] ?? null;
  }
  
  return {
    totalTrades,
    winRate: 0, // Will be calculated based on resolved positions
    bestTrade,
    worstTrade,
    totalPnL: state.totalPnL,
  };
}
