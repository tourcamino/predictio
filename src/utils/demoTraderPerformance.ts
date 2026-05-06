import type { MockTrader } from "~/data/mockData";

export type TraderPerformancePayload = {
  pnlHistory: Array<{ date: Date; pnl: number; cumulativePnl: number }>;
  winRateHistory: Array<{ date: Date; winRate: number; trades: number }>;
  roiHistory: Array<{ date: Date; roi: number }>;
  volumeHistory: Array<{ date: Date; volume: number }>;
  profitDistribution: {
    wins: number;
    losses: number;
    avgWin: number;
    avgLoss: number;
    largestWin: number;
    largestLoss: number;
  };
  summary: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalVolume: number;
    totalPnL: number;
    avgRoi: number;
    avgWinRate: number;
  };
};

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function rangeToMs(range: "7d" | "30d" | "90d" | "1y" | "all"): number {
  switch (range) {
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "90d":
      return 90 * 24 * 60 * 60 * 1000;
    case "1y":
      return 365 * 24 * 60 * 60 * 1000;
    case "all":
    default:
      return 540 * 24 * 60 * 60 * 1000;
  }
}

/**
 * Deterministic demo series for trader profiles when the DB has no orders yet (mock / demo mode).
 * Shapes match getTraderPerformanceHistory output for TraderPerformanceCharts.
 */
export function buildDemoTraderPerformance(
  trader: MockTrader,
  timeRange: "7d" | "30d" | "90d" | "1y" | "all",
): TraderPerformancePayload {
  const rand = rng(hashSeed(trader.wallet));
  const now = Date.now();
  const spanMs = rangeToMs(timeRange);
  const steps = Math.min(
    90,
    Math.max(
      14,
      Math.ceil(spanMs / (24 * 60 * 60 * 1000)),
    ),
  );
  const stepMs = spanMs / steps;

  const targetPnL =
    trader.totalPnl ??
    ((trader.winRate / 100 - 0.5) * Math.min(trader.totalVolume * 0.08, 8000));

  const wins = trader.winningTrades;
  const losses = Math.max(0, trader.totalTrades - wins);
  const avgWinAmt =
    wins > 0 ? Math.max(15, (Math.abs(targetPnL) + trader.totalVolume * 0.02) / wins) : 0;
  const avgLossAmt =
    losses > 0 ? Math.max(10, (trader.totalVolume * 0.015) / Math.max(1, losses)) : 0;

  const pnlHistory: TraderPerformancePayload["pnlHistory"] = [];
  const winRateHistory: TraderPerformancePayload["winRateHistory"] = [];
  const roiHistory: TraderPerformancePayload["roiHistory"] = [];
  const volumeHistory: TraderPerformancePayload["volumeHistory"] = [];

  let cumulative = 0;
  let invested = 0;

  for (let i = 0; i <= steps; i++) {
    const t = now - spanMs + i * stepMs;
    const date = new Date(t);
    const progress = steps > 0 ? i / steps : 1;
    const wave = Math.sin(progress * Math.PI * 3) * (Math.abs(targetPnL) * 0.08);
    const noise = (rand() - 0.5) * Math.abs(targetPnL) * 0.05;
    const segmentPnL =
      i === 0
        ? 0
        : (targetPnL / steps) * (0.85 + rand() * 0.3) + wave / steps + noise / steps;

    cumulative += segmentPnL;
    if (i > 0) {
      invested += trader.totalVolume / steps;
    }

    const dayTrades = Math.max(1, Math.round(trader.totalTrades / steps));
    const dayWins = Math.round(dayTrades * (trader.winRate / 100));
    const wr =
      trader.winRate + (rand() - 0.5) * 12 * Math.sin(progress * Math.PI * 2);

    pnlHistory.push({
      date,
      pnl: segmentPnL,
      cumulativePnl: cumulative,
    });
    winRateHistory.push({
      date,
      winRate: Math.min(95, Math.max(35, wr)),
      trades: dayTrades,
    });
    roiHistory.push({
      date,
      roi: invested > 0 ? (cumulative / invested) * 100 : 0,
    });
    volumeHistory.push({
      date,
      volume: (trader.totalVolume / steps) * (0.7 + rand() * 0.6),
    });
  }

  const finalCumulative = pnlHistory[pnlHistory.length - 1]?.cumulativePnl ?? 0;
  const scale =
    Math.abs(targetPnL) > 0.01 && Math.abs(finalCumulative - targetPnL) > 1
      ? targetPnL / finalCumulative
      : 1;

  if (scale !== 1) {
    let acc = 0;
    for (let i = 0; i < pnlHistory.length; i++) {
      acc += pnlHistory[i]!.pnl * scale;
      pnlHistory[i]!.cumulativePnl = acc;
      pnlHistory[i]!.pnl *= scale;
    }
    const lastRoi = roiHistory[roiHistory.length - 1];
    if (lastRoi && invested > 0) {
      lastRoi.roi = (acc / invested) * 100;
    }
  }

  return {
    pnlHistory,
    winRateHistory,
    roiHistory,
    volumeHistory,
    profitDistribution: {
      wins,
      losses,
      avgWin: avgWinAmt,
      avgLoss: avgLossAmt,
      largestWin: avgWinAmt * (1.4 + rand() * 0.5),
      largestLoss: -avgLossAmt * (1.2 + rand() * 0.4),
    },
    summary: {
      totalTrades: trader.totalTrades,
      winningTrades: wins,
      losingTrades: losses,
      totalVolume: trader.totalVolume,
      totalPnL: pnlHistory[pnlHistory.length - 1]?.cumulativePnl ?? 0,
      avgRoi:
        invested > 0
          ? ((pnlHistory[pnlHistory.length - 1]?.cumulativePnl ?? 0) / invested) * 100
          : 0,
      avgWinRate: trader.winRate,
    },
  };
}
