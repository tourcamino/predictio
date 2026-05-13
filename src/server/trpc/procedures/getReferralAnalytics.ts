import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getReferralAnalytics = baseProcedure
  .input(z.object({ walletAddress: z.string() }))
  .query(async ({ input }) => {
    const normalizedWallet = input.walletAddress.toLowerCase();
    
    // Get affiliate record
    const affiliate = await db.affiliate.findUnique({
      where: { walletAddress: normalizedWallet },
    });
    
    if (!affiliate) {
      return {
        hasData: false,
        overview: {
          totalReferrals: 0,
          activeReferrals: 0,
          totalVolume: 0,
          conversionRate: 0,
        },
        volumeChart: [],
        topReferrals: [],
        sharePerformance: {
          totalClicks: 0,
          clicksByChannel: [],
          conversionRate: 0,
        },
        analystPerformance: null,
      };
    }
    
    // Get all referral tracking data
    const referrals = await db.referralTracking.findMany({
      where: { refCode: affiliate.refCode },
    });
    
    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter(r => r.isActive).length;
    
    // Get all referral rewards
    const allRewards = await db.affiliateReward.findMany({
      where: {
        walletAddress: normalizedWallet,
        rewardType: { in: ['referral', 'both'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    const totalVolume = allRewards.reduce((sum, r) => sum + r.volumeUsd, 0);
    
    // Calculate conversion rate (referrals who have traded at least once)
    const referralsWhoTraded = new Set(allRewards.map(r => r.tradeId)).size;
    const conversionRate = totalReferrals > 0 ? (referralsWhoTraded / totalReferrals) * 100 : 0;
    
    // Generate volume chart (last 30 days)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    const recentRewards = allRewards.filter(
      r => r.createdAt.getTime() >= thirtyDaysAgo
    );
    
    // Group by day
    const dailyVolume = new Map<string, { volume: number; fees: number; reward: number }>();
    
    recentRewards.forEach(reward => {
      const date = new Date(reward.createdAt);
      const dateKey = date.toISOString().slice(0, 10);
      
      const current = dailyVolume.get(dateKey) || { volume: 0, fees: 0, reward: 0 };
      dailyVolume.set(dateKey, {
        volume: current.volume + reward.volumeUsd,
        fees: current.fees + reward.feeTotalUsd,
        reward: current.reward + reward.rewardUsd,
      });
    });
    
    // Generate array for last 30 days
    const volumeChart = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().slice(0, 10);
      const data = dailyVolume.get(dateKey) || { volume: 0, fees: 0, reward: 0 };
      
      volumeChart.push({
        date: date.getTime(),
        volume: data.volume,
        fees: data.fees,
        reward: data.reward,
      });
    }
    
    // Get top referrals by volume
    const topReferrals = await Promise.all(
      referrals.slice(0, 10).map(async (ref) => {
        const user = await db.user.findUnique({
          where: { wallet: ref.referredWallet },
        });
        
        // Get rewards for this specific user (we'd need to track this better in production)
        const userRewards = allRewards.filter(r => {
          // In production, we'd have a proper link between rewards and referred users
          // For now, estimate based on timing
          return r.createdAt >= ref.attributedAt;
        });
        
        const volumeGenerated = user?.totalVolume || 0;
        const tradesCount = user?.tradesCount || 0;
        const feesGenerated = volumeGenerated * 0.01; // 1% fee
        const yourReward = feesGenerated * 0.15; // 15% referral share
        
        return {
          wallet: `${ref.referredWallet.slice(0, 6)}...${ref.referredWallet.slice(-4)}`,
          joinedAt: ref.attributedAt,
          trades: tradesCount,
          volumeGenerated,
          feesGenerated,
          yourReward,
        };
      })
    );
    
    // Sort by volume and take top 10
    topReferrals.sort((a, b) => b.volumeGenerated - a.volumeGenerated);
    const top10Referrals = topReferrals.slice(0, 10);
    
    // Share performance (mocked for now - would need click tracking)
    const sharePerformance = {
      totalClicks: Math.floor(totalReferrals * (2 + Math.random() * 3)), // Mock: 2-5x referrals
      clicksByChannel: [
        { channel: 'Direct', clicks: Math.floor(totalReferrals * 1.2), conversions: Math.floor(totalReferrals * 0.6) },
        { channel: 'Twitter', clicks: Math.floor(totalReferrals * 0.8), conversions: Math.floor(totalReferrals * 0.3) },
        { channel: 'Telegram', clicks: Math.floor(totalReferrals * 0.5), conversions: Math.floor(totalReferrals * 0.1) },
      ],
      conversionRate: totalReferrals > 0 ? (totalReferrals / (totalReferrals * 2.5)) * 100 : 0,
    };
    
    // Get analyst performance if they are an analyst
    const analyst = await db.analyst.findUnique({
      where: { wallet: normalizedWallet },
    });
    
    let analystPerformance = null;
    if (analyst) {
      // Get copy relationships
      const copyRelationships = await db.copyRelationship.findMany({
        where: {
          analystWallet: normalizedWallet,
          isActive: true,
        },
      });
      
      const activeCopiers = copyRelationships.length;
      const volumeGenerated = analyst.volumeGenerated;
      
      // Generate copiers chart (last 30 days)
      // In production, we'd track this over time
      const copiersChart = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000);
        // Mock data showing growth
        const copiers = Math.max(0, activeCopiers - Math.floor((i / 30) * activeCopiers * 0.3));
        copiersChart.push({
          date: date.getTime(),
          copiers,
        });
      }
      
      // Top copiers by volume
      const topCopiers = await Promise.all(
        copyRelationships.slice(0, 5).map(async (rel) => {
          return {
            wallet: `${rel.copierWallet.slice(0, 6)}...${rel.copierWallet.slice(-4)}`,
            startedAt: rel.startedAt,
            volumeCopied: rel.totalVolumeCopied,
          };
        })
      );
      
      topCopiers.sort((a, b) => b.volumeCopied - a.volumeCopied);
      
      analystPerformance = {
        activeCopiers,
        volumeGenerated,
        copiersChart,
        topCopiers: topCopiers.slice(0, 5),
      };
    }
    
    return {
      hasData: true,
      overview: {
        totalReferrals,
        activeReferrals,
        totalVolume,
        conversionRate,
      },
      volumeChart,
      topReferrals: top10Referrals,
      sharePerformance,
      analystPerformance,
    };
  });
