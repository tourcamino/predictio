import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getVaultPerformanceHistory = baseProcedure
  .input(
    z.object({
      timeRange: z.enum(['7D', '30D', '90D', 'ALL']).default('30D'),
    })
  )
  .query(async ({ input }) => {
    const { timeRange } = input;

    // Calculate time threshold
    const now = new Date();
    const timeThresholds = {
      '7D': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30D': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90D': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      'ALL': new Date(0),
    };
    const threshold = timeThresholds[timeRange];

    // Get current vault state
    const vaultState = await db.vaultState.findUnique({
      where: { id: 'singleton' },
    });

    if (!vaultState) {
      return {
        currentMetrics: {
          totalTvl: 0,
          availableLiquidity: 0,
          exposedLiquidity: 0,
          totalFeesCollected: 0,
          roi: 0,
          apy: 0,
        },
        historicalData: [],
        feeAccumulation: [],
        capitalFlows: [],
      };
    }

    // Get fee earnings over time (daily aggregation)
    const feeEarnings = await db.lPFeeEarning.findMany({
      where: {
        createdAt: {
          gte: threshold,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get transactions (deposits/withdrawals to protocol vault)
    const transactions = await db.transaction.findMany({
      where: {
        type: {
          in: ['protocol_vault_deposit', 'protocol_vault_withdrawal'],
        },
        createdAt: {
          gte: threshold,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Aggregate fees by day
    const feesByDay = new Map<string, number>();
    feeEarnings.forEach(fee => {
      const dateKey = fee.createdAt.toISOString().slice(0, 10);
      feesByDay.set(dateKey, (feesByDay.get(dateKey) || 0) + fee.amount);
    });

    // Build daily data points
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : timeRange === '90D' ? 90 : 365;
    const historicalData: Array<{
      date: Date;
      tvl: number;
      exposedLiquidity: number;
      availableLiquidity: number;
      feesEarned: number;
      cumulativeFees: number;
    }> = [];

    let cumulativeFees = 0;
    const seedCapital = 500; // Initial seed

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().slice(0, 10);
      
      const dailyFees = feesByDay.get(dateKey) || 0;
      cumulativeFees += dailyFees;

      // For simplicity, use current state for recent data
      // In production, you'd want to track historical snapshots
      const tvl = i === 0 ? vaultState.totalTvl : seedCapital + (cumulativeFees * 0.7); // Rough estimate
      const exposedLiquidity = i === 0 ? vaultState.exposedLiquidity : tvl * 0.3;
      const availableLiquidity = tvl - exposedLiquidity;

      historicalData.push({
        date,
        tvl,
        exposedLiquidity,
        availableLiquidity,
        feesEarned: dailyFees,
        cumulativeFees,
      });
    }

    // Build fee accumulation chart data
    const feeAccumulation = historicalData.map(d => ({
      date: d.date,
      amount: d.cumulativeFees,
      dailyAmount: d.feesEarned,
    }));

    // Build capital flows data
    const capitalFlows = transactions.map(tx => ({
      date: tx.createdAt,
      type: tx.type === 'protocol_vault_deposit' ? 'deposit' : 'withdrawal',
      amount: tx.amount,
    }));

    // Calculate ROI and APY
    const totalFeesCollected = vaultState.feeCollected;
    const initialCapital = seedCapital;
    const currentValue = vaultState.totalTvl;
    const roi = ((currentValue - initialCapital) / initialCapital) * 100;

    // Calculate APY based on time since inception
    const inceptionDate = new Date('2024-01-01'); // Adjust based on actual inception
    const daysActive = Math.max(1, (now.getTime() - inceptionDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyReturn = (currentValue - initialCapital) / initialCapital / daysActive;
    const apy = dailyReturn * 365 * 100;

    // Get active orders count
    const activeOrdersCount = await db.ammOrder.count({
      where: { status: 'ACTIVE' },
    });

    // Get total orders placed
    const totalOrdersPlaced = await db.ammOrder.count();

    return {
      currentMetrics: {
        totalTvl: vaultState.totalTvl,
        availableLiquidity: vaultState.availableLiquidity,
        exposedLiquidity: vaultState.exposedLiquidity,
        totalFeesCollected,
        roi: Math.round(roi * 100) / 100,
        apy: Math.round(apy * 100) / 100,
        activeOrdersCount,
        totalOrdersPlaced,
      },
      historicalData,
      feeAccumulation,
      capitalFlows,
    };
  });
