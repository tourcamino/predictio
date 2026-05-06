import { useState, useEffect } from 'react';
import {
  getDemoState,
  saveDemoState,
  resetDemoAccount,
  activateDemoMode,
  deactivateDemoMode,
  calculateDemoStats,
  type DemoState,
  type DemoPosition,
  type DemoTrade,
} from '~/lib/demoStorage';
import { getMarketById } from '~/data/mockMarkets';
import { calcFee } from '~/utils/marketUtils';

interface UseDemoAccountReturn {
  demoState: DemoState;
  isActive: boolean;
  balance: number;
  positions: DemoPosition[];
  tradeHistory: DemoTrade[];
  stats: ReturnType<typeof calculateDemoStats>;
  executeDemoTrade: (params: {
    marketId: string;
    outcome: 'YES' | 'NO';
    type: 'BUY' | 'SELL';
    amount: number;
    price: number;
  }) => Promise<{ success: boolean; message: string }>;
  activateDemo: () => void;
  deactivateDemo: () => void;
  resetDemo: () => void;
  refreshState: () => void;
}

export function useDemoAccount(): UseDemoAccountReturn {
  const [demoState, setDemoState] = useState<DemoState>(() => {
    const state = getDemoState();
    // Ensure demo mode is always active
    if (!state.active) {
      state.active = true;
      saveDemoState(state);
    }
    return state;
  });
  
  // Refresh state from localStorage
  const refreshState = () => {
    const state = getDemoState();
    // Ensure demo mode is always active
    if (!state.active) {
      state.active = true;
      saveDemoState(state);
    }
    setDemoState(state);
  };
  
  // Update current prices for all positions
  useEffect(() => {
    if (!demoState.active) return;
    
    const updatedPositions = demoState.positions.map(position => {
      const market = getMarketById(position.marketId);
      if (market) {
        const currentPrice = position.outcome === 'YES' ? market.yesPrice : market.noPrice;
        return { ...position, currentPrice };
      }
      return position;
    });
    
    if (JSON.stringify(updatedPositions) !== JSON.stringify(demoState.positions)) {
      const newState = { ...demoState, positions: updatedPositions };
      setDemoState(newState);
      saveDemoState(newState);
    }
  }, [demoState.active, demoState.positions]);
  
  const executeDemoTrade = async (params: {
    marketId: string;
    outcome: 'YES' | 'NO';
    type: 'BUY' | 'SELL';
    amount: number;
    price: number;
  }): Promise<{ success: boolean; message: string }> => {
    const { marketId, outcome, type, amount, price } = params;
    
    // Get market data
    const market = getMarketById(marketId);
    if (!market) {
      return { success: false, message: 'Market not found' };
    }
    
    const currentState = getDemoState();
    
    if (type === 'BUY') {
      // Calculate fee (using real fee logic)
      const fee = amount * calcFee(price);
      const totalCost = amount + fee;
      
      // Check balance
      if (totalCost > currentState.balance) {
        return { success: false, message: 'Insufficient balance' };
      }
      
      // Calculate shares received
      const shares = amount / price;
      
      // Update or create position
      const existingPositionIndex = currentState.positions.findIndex(
        p => p.marketId === marketId && p.outcome === outcome
      );
      
      if (existingPositionIndex >= 0) {
        const existingPosition = currentState.positions[existingPositionIndex];
        const totalShares = existingPosition.shares + shares;
        const totalCost = (existingPosition.shares * existingPosition.avgPrice) + amount;
        const newAvgPrice = totalCost / totalShares;
        
        currentState.positions[existingPositionIndex] = {
          ...existingPosition,
          shares: totalShares,
          avgPrice: newAvgPrice,
          currentPrice: price,
        };
      } else {
        currentState.positions.push({
          marketId,
          marketTitle: `${market.teamA} vs ${market.teamB}`,
          outcome,
          shares,
          avgPrice: price,
          currentPrice: price,
          openedAt: Date.now(),
        });
      }
      
      // Update balance
      currentState.balance -= totalCost;
      
      // Add to trade history
      const trade: DemoTrade = {
        id: `demo-${Date.now()}-${Math.random()}`,
        marketId,
        type: 'BUY',
        outcome,
        shares,
        price,
        total: totalCost,
        timestamp: Date.now(),
      };
      currentState.tradeHistory.unshift(trade);
      
      // Save state
      saveDemoState(currentState);
      setDemoState(currentState);
      
      return {
        success: true,
        message: `Bought ${shares.toFixed(2)} ${outcome} shares at $${price.toFixed(2)}`,
      };
    } else {
      // SELL logic
      const position = currentState.positions.find(
        p => p.marketId === marketId && p.outcome === outcome
      );
      
      if (!position) {
        return { success: false, message: 'No position to sell' };
      }
      
      const sharesToSell = amount / price;
      if (sharesToSell > position.shares) {
        return { success: false, message: 'Insufficient shares' };
      }
      
      // Calculate proceeds (no fee on sells for simplicity)
      const proceeds = amount;
      
      // Update position
      if (sharesToSell >= position.shares) {
        // Close position completely
        currentState.positions = currentState.positions.filter(
          p => !(p.marketId === marketId && p.outcome === outcome)
        );
      } else {
        // Reduce position
        position.shares -= sharesToSell;
      }
      
      // Update balance
      currentState.balance += proceeds;
      
      // Calculate P&L for this trade
      const costBasis = sharesToSell * position.avgPrice;
      const pnl = proceeds - costBasis;
      currentState.totalPnL += pnl;
      
      // Add to trade history
      const trade: DemoTrade = {
        id: `demo-${Date.now()}-${Math.random()}`,
        marketId,
        type: 'SELL',
        outcome,
        shares: sharesToSell,
        price,
        total: proceeds,
        timestamp: Date.now(),
      };
      currentState.tradeHistory.unshift(trade);
      
      // Save state
      saveDemoState(currentState);
      setDemoState(currentState);
      
      return {
        success: true,
        message: `Sold ${sharesToSell.toFixed(2)} ${outcome} shares at $${price.toFixed(2)}`,
      };
    }
  };
  
  const activateDemo = () => {
    const newState = activateDemoMode();
    setDemoState(newState);
  };
  
  const deactivateDemo = () => {
    // Demo mode is now permanent - this function no longer deactivates
    // Just refresh state to ensure it's active
    const state = getDemoState();
    state.active = true;
    saveDemoState(state);
    setDemoState(state);
  };
  
  const resetDemo = () => {
    const newState = resetDemoAccount();
    setDemoState(newState);
  };
  
  const stats = calculateDemoStats(demoState);
  
  return {
    demoState,
    isActive: demoState.active,
    balance: demoState.balance,
    positions: demoState.positions,
    tradeHistory: demoState.tradeHistory,
    stats,
    executeDemoTrade,
    activateDemo,
    deactivateDemo,
    resetDemo,
    refreshState,
  };
}
