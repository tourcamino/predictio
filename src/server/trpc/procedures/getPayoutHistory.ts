import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getPayoutHistory = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      limit: z.number().min(1).max(50).default(10),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ input }) => {
    const normalizedWallet = input.walletAddress.toLowerCase();
    
    // Get affiliate record
    const affiliate = await db.affiliate.findUnique({
      where: { walletAddress: normalizedWallet },
    });
    
    if (!affiliate) {
      return {
        payouts: [],
        totalCount: 0,
        hasMore: false,
        summary: {
          totalPaidUsd: 0,
          totalPaidEur: 0,
          lastPayout: null,
          pendingUsd: 0,
          pendingEur: 0,
          progressToThreshold: 0,
        },
      };
    }
    
    // Get total count of payouts
    const totalCount = await db.payoutLog.count({
      where: { walletAddress: normalizedWallet },
    });
    
    // Get paginated payouts
    const payouts = await db.payoutLog.findMany({
      where: { walletAddress: normalizedWallet },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
      skip: input.offset,
    });
    
    // For each payout, get the included rewards
    const payoutsWithRewards = await Promise.all(
      payouts.map(async (payout) => {
        const rewards = await db.affiliateReward.findMany({
          where: {
            id: { in: payout.rewardIds.map(String) },
          },
          orderBy: { createdAt: 'desc' },
        });
        
        return {
          id: payout.id,
          date: payout.createdAt,
          amountUsd: payout.amountUsd,
          amountEur: payout.amountEur,
          status: 'paid' as const,
          reference: payout.txHash || payout.id.slice(0, 8),
          paidBy: payout.paidBy,
          rewardsIncluded: rewards.map(r => ({
            id: r.id,
            date: r.createdAt,
            volumeUsd: r.volumeUsd,
            feeUsd: r.feeTotalUsd,
            rewardUsd: r.rewardUsd,
            rewardEur: r.rewardEur,
            type: r.rewardType,
          })),
        };
      })
    );
    
    // Get pending rewards (not yet paid)
    const pendingRewards = await db.affiliateReward.findMany({
      where: {
        walletAddress: normalizedWallet,
        status: { in: ['pending', 'pending_payment'] },
      },
    });
    
    const pendingUsd = pendingRewards.reduce((sum, r) => sum + r.rewardUsd, 0);
    const pendingEur = pendingRewards.reduce((sum, r) => sum + r.rewardEur, 0);
    
    // Calculate summary
    const totalPaidUsd = payouts.reduce((sum, p) => sum + p.amountUsd, 0);
    const totalPaidEur = payouts.reduce((sum, p) => sum + p.amountEur, 0);
    
    const lastPayout = payouts.length > 0 ? payouts[0] : null;
    
    // Progress to €10 threshold
    const PAYOUT_THRESHOLD_EUR = 10;
    const progressToThreshold = Math.min(100, (pendingEur / PAYOUT_THRESHOLD_EUR) * 100);
    
    return {
      payouts: payoutsWithRewards,
      totalCount,
      hasMore: input.offset + input.limit < totalCount,
      summary: {
        totalPaidUsd,
        totalPaidEur,
        lastPayout: lastPayout ? {
          date: lastPayout.createdAt,
          amountUsd: lastPayout.amountUsd,
          amountEur: lastPayout.amountEur,
        } : null,
        pendingUsd,
        pendingEur,
        progressToThreshold,
      },
    };
  });
