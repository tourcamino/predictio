import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "~/lib/demoStorage";
import type { Market } from "~/data/mockMarkets";
import { calcFee } from "~/utils/marketUtils";
import { useTRPC, useTRPCClient } from "~/trpc/react";

/** Stable fallback — `?? {}` is a new object every render and retriggers effects that list `marketMap` as a dependency. */
const EMPTY_MARKET_MAP: Record<string, Market | null> = {};

interface UseDemoAccountReturn {
  demoState: DemoState;
  isActive: boolean;
  balance: number;
  positions: DemoPosition[];
  tradeHistory: DemoTrade[];
  stats: ReturnType<typeof calculateDemoStats>;
  executeDemoTrade: (params: {
    marketId: string;
    outcome: "YES" | "NO" | "DRAW";
    type: "BUY" | "SELL";
    amount: number;
    price: number;
  }) => Promise<{ success: boolean; message: string }>;
  activateDemo: () => void;
  deactivateDemo: () => void;
  resetDemo: () => void;
  refreshState: () => void;
}

export function useDemoAccount(): UseDemoAccountReturn {
  const trpc = useTRPC();
  const client = useTRPCClient();

  const [demoState, setDemoState] = useState<DemoState>(() => {
    return getDemoState();
  });

  const positionIds = useMemo(
    () => [...new Set(demoState.positions.map((p) => p.marketId))],
    [demoState.positions],
  );

  const summariesQuery = useQuery({
    ...trpc.getMarketSummaries.queryOptions({
      marketIds: positionIds,
    }),
    enabled: demoState.active && positionIds.length > 0,
    staleTime: 20_000,
  });

  const marketMap = summariesQuery.data ?? EMPTY_MARKET_MAP;

  const refreshState = () => {
    setDemoState(getDemoState());
  };

  useEffect(() => {
    if (!demoState.active) return;

    const updatedPositions = demoState.positions.map((position) => {
      const market = marketMap[position.marketId];
      if (market) {
        const currentPrice =
          position.outcome === "YES"
            ? market.yesPrice
            : position.outcome === "DRAW" && market.percentDraw != null
              ? market.percentDraw / 100
              : market.noPrice;
        return { ...position, currentPrice };
      }
      return position;
    });

    if (JSON.stringify(updatedPositions) !== JSON.stringify(demoState.positions)) {
      const newState = { ...demoState, positions: updatedPositions };
      setDemoState(newState);
      saveDemoState(newState);
    }
  }, [demoState.active, demoState.positions, marketMap]);

  const executeDemoTrade = async (params: {
    marketId: string;
    outcome: "YES" | "NO" | "DRAW";
    type: "BUY" | "SELL";
    amount: number;
    price: number;
  }): Promise<{ success: boolean; message: string }> => {
    const { marketId, outcome, type, amount, price } = params;

    let market = marketMap[marketId];
    if (!market) {
      const fetched = await client.getMarketSummaries.query({
        marketIds: [marketId],
      });
      market = fetched[marketId] ?? null;
    }
    if (!market) {
      return { success: false, message: "Market not found" };
    }

    const currentState = getDemoState();

    if (type === "BUY") {
      const fee = amount * calcFee(price);
      const totalCost = amount + fee;

      if (totalCost > currentState.balance) {
        return { success: false, message: "Insufficient balance" };
      }

      const shares = amount / price;

      const existingPositionIndex = currentState.positions.findIndex(
        (p) => p.marketId === marketId && p.outcome === outcome,
      );

      if (existingPositionIndex >= 0) {
        const existingPosition = currentState.positions[existingPositionIndex]!;
        const totalShares = existingPosition.shares + shares;
        const mergeCost =
          existingPosition.shares * existingPosition.avgPrice + amount;
        const newAvgPrice = mergeCost / totalShares;

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

      currentState.balance -= totalCost;

      const trade: DemoTrade = {
        id: `demo-${Date.now()}-${Math.random()}`,
        marketId,
        type: "BUY",
        outcome,
        shares,
        price,
        total: totalCost,
        timestamp: Date.now(),
      };
      currentState.tradeHistory.unshift(trade);

      saveDemoState(currentState);
      setDemoState(currentState);

      return {
        success: true,
        message: `Bought ${shares.toFixed(2)} ${outcome} shares at $${price.toFixed(2)}`,
      };
    }

    const position = currentState.positions.find(
      (p) => p.marketId === marketId && p.outcome === outcome,
    );

    if (!position) {
      return { success: false, message: "No position to sell" };
    }

    const sharesToSell = amount / price;
    if (sharesToSell > position.shares) {
      return { success: false, message: "Insufficient shares" };
    }

    const proceeds = amount;

    if (sharesToSell >= position.shares) {
      currentState.positions = currentState.positions.filter(
        (p) => !(p.marketId === marketId && p.outcome === outcome),
      );
    } else {
      position.shares -= sharesToSell;
    }

    currentState.balance += proceeds;

    const costBasis = sharesToSell * position.avgPrice;
    const pnl = proceeds - costBasis;
    currentState.totalPnL += pnl;

    const trade: DemoTrade = {
      id: `demo-${Date.now()}-${Math.random()}`,
      marketId,
      type: "SELL",
      outcome,
      shares: sharesToSell,
      price,
      total: proceeds,
      timestamp: Date.now(),
    };
    currentState.tradeHistory.unshift(trade);

    saveDemoState(currentState);
    setDemoState(currentState);

    return {
      success: true,
      message: `Sold ${sharesToSell.toFixed(2)} ${outcome} shares at $${price.toFixed(2)}`,
    };
  };

  const activateDemo = () => {
    const newState = activateDemoMode();
    setDemoState(newState);
  };

  const deactivateDemo = () => {
    const state = deactivateDemoMode();
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
