import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { FEE_REFERRAL } from "~/server/services/feeCalculation";

export const getReferralEarnings = baseProcedure
  .input(z.object({ walletAddress: z.string() }))
  .query(async ({ input }) => {
    const normalizedWallet = input.walletAddress.toLowerCase();
    
    // Get affiliate record
    const affiliate = await db.affiliate.findUnique({
      where: { walletAddress: normalizedWallet },
    });
    
    if (!affiliate) {
      // Return empty state if not an affiliate
      return {
        hasReferralCode: false,
        referralCode: null,
        totalEarned: 0,
        pendingRewards: 0,
        totalReferrals: 0,
        activeReferrals: 0,
        totalVolume: 0,
        recentRewards: [],
        topReferrals: [],
        earningsHistory: [],
        feeRate: FEE_REFERRAL,
      };
    }
    
    // Get all referral rewards
    const allRewards = await db.affiliateReward.findMany({
      where: {
        walletAddress: normalizedWallet,
        rewardType: { in: ['referral', 'both'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Calculate stats
    const pendingRewards = allRewards
      .filter(r => r.status === 'pending' || r.status === 'pending_payment')
      .reduce((sum, r) => sum + r.rewardUsd, 0);
    
    const paidRewards = allRewards
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + r.rewardUsd, 0);
    
    const totalEarned = pendingRewards + paidRewards;
    
    // Get recent rewards (last 10)
    const recentRewards = allRewards.slice(0, 10).map(reward => ({
      id: reward.id,
      amount: reward.rewardUsd,
      volume: reward.volumeUsd,
      fee: reward.feeTotalUsd,
      status: reward.status,
      createdAt: reward.createdAt,
      tradeId: reward.tradeId,
    }));
    
    // Get referral tracking data
    const referralTracking = await db.referralTracking.findMany({
      where: {
        refCode: affiliate.refCode,
      },
    });
    
    const activeReferrals = referralTracking.filter(r => r.isActive).length;
    
    // Calculate top referrals by volume
    // Group rewards by referred wallet (we'd need to join with transactions to get this)
    // For now, return mock data structure
    const topReferrals = await getTopReferrals(affiliate.refCode);
    
    // Generate earnings history (last 30 days)
    const earningsHistory = await generateEarningsHistory(normalizedWallet, allRewards);
    
    return {
      hasReferralCode: true,
      referralCode: affiliate.refCode,
      totalEarned,
      pendingRewards,
      totalReferrals: affiliate.totalReferrals,
      activeReferrals,
      totalVolume: affiliate.totalVolumeUsd,
      recentRewards,
      topReferrals,
      earningsHistory,
      feeRate: FEE_REFERRAL,
    };
  });

async function getTopReferrals(refCode: string) {
  // Get all referrals
  const referrals = await db.referralTracking.findMany({
    where: { refCode },
    take: 10,
  });
  
  // For each referral, calculate their volume and earnings generated
  const topReferrals = await Promise.all(
    referrals.map(async (ref) => {
      // Get user's total volume
      const user = await db.user.findUnique({
        where: { wallet: ref.referredWallet },
        select: { totalVolume: true },
      });
      
      // Get rewards generated from this user
      const rewards = await db.affiliateReward.findMany({
        where: {
          rewardType: { in: ['referral', 'both'] },
          // We'd need to track which rewards came from which referral
          // For now, estimate based on volume
        },
      });
      
      const volume = user?.totalVolume || 0;
      const earnedFromUser = volume * 0.01 * 0.15; // Estimate: 1% fee * 15% referral share
      
      return {
        wallet: `${ref.referredWallet.slice(0, 6)}...${ref.referredWallet.slice(-4)}`,
        volumeGenerated: volume,
        earnedFromUser,
        joinedAt: ref.attributedAt,
        isActive: ref.isActive,
      };
    })
  );
  
  return topReferrals
    .sort((a, b) => b.volumeGenerated - a.volumeGenerated)
    .slice(0, 5);
}

async function generateEarningsHistory(walletAddress: string, allRewards: any[]) {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  
  // Filter rewards from last 30 days
  const recentRewards = allRewards.filter(
    r => r.createdAt.getTime() >= thirtyDaysAgo
  );
  
  // Group by day
  const dailyEarnings = new Map<string, number>();
  
  recentRewards.forEach(reward => {
    const date = new Date(reward.createdAt);
    const dateKey = date.toISOString().slice(0, 10);
    
    const current = dailyEarnings.get(dateKey) || 0;
    dailyEarnings.set(dateKey, current + reward.rewardUsd);
  });
  
  // Generate array for last 30 days
  const history = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().slice(0, 10);
    
    history.push({
      date: date.getTime(),
      earnings: dailyEarnings.get(dateKey) || 0,
    });
  }
  
  return history;
}
