import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { FEE_VAULT, FEE_ANALYST, FEE_REFERRAL } from "~/server/services/feeCalculation";

export const getFeeRevenue = baseProcedure
  .input(
    z.object({
      timeRange: z.enum(['today', 'week', 'month']).default('month'),
    })
  )
  .query(async ({ input }) => {
    const { timeRange } = input;

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get all bet transactions with fees
    const transactions = await db.transaction.findMany({
      where: {
        type: 'position_open',
        createdAt: {
          gte: startDate,
        },
        status: 'completed',
      },
      select: {
        feePaid: true,
        createdAt: true,
        metadata: true,
      },
    });

    // Calculate totals using new fee structure (50/35/15)
    const totalFees = transactions.reduce((sum, tx) => sum + tx.feePaid, 0);
    
    // In the new system:
    // - 50% goes to Protocol Vault
    // - 35% goes to Analysts (when applicable)
    // - 15% goes to Referrals (when applicable)
    // - Treasury receives amounts when there's no analyst/referral
    
    const vaultAmount = totalFees * FEE_VAULT; // 50% always goes to vault
    const analystPoolAmount = totalFees * FEE_ANALYST; // 35% allocated to analysts
    const referralPoolAmount = totalFees * FEE_REFERRAL; // 15% allocated to referrals
    const totalAffiliatePool = analystPoolAmount + referralPoolAmount; // Combined affiliate rewards

    // Calculate average fee rate
    const totalVolume = transactions.reduce((sum, tx) => {
      const metadata = tx.metadata as any;
      return sum + (metadata?.amount || 0);
    }, 0);
    const avgFeeRate = totalVolume > 0 ? totalFees / totalVolume : 0;

    // Count market vs limit orders
    const marketOrders = transactions.filter(tx => {
      const metadata = tx.metadata as any;
      return !metadata?.orderType || metadata.orderType === 'MARKET';
    }).length;
    const limitOrders = transactions.length - marketOrders;
    const marketOrdersPct = transactions.length > 0 ? marketOrders / transactions.length : 0;
    const limitOrdersPct = transactions.length > 0 ? limitOrders / transactions.length : 0;

    // Get daily breakdown for today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayTransactions = transactions.filter(tx => tx.createdAt >= todayStart);
    const todayFees = todayTransactions.reduce((sum, tx) => sum + tx.feePaid, 0);

    // Get weekly breakdown
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekTransactions = transactions.filter(tx => tx.createdAt >= weekStart);
    const weekFees = weekTransactions.reduce((sum, tx) => sum + tx.feePaid, 0);

    return {
      today: todayFees,
      week: weekFees,
      month: totalFees,
      avgFeeRate,
      marketOrdersPct,
      limitOrdersPct,
      vaultSplit: FEE_VAULT, // 50%
      analystSplit: FEE_ANALYST, // 35%
      referralSplit: FEE_REFERRAL, // 15%
      vaultAmount, // 50% of fees
      analystPoolAmount, // 35% of fees
      referralPoolAmount, // 15% of fees
      totalAffiliatePool, // 50% of fees (35% + 15%)
      totalTransactions: transactions.length,
    };
  });
