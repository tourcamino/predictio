import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { FEE_ANALYST } from "~/server/services/feeCalculation";

export const getAnalystDashboard = baseProcedure
  .input(z.object({ wallet: z.string() }))
  .query(async ({ input }) => {
    const normalizedWallet = input.wallet.toLowerCase();
    
    // Query analyst from database
    const analyst = await db.analyst.findUnique({
      where: { wallet: normalizedWallet },
    });
    
    if (!analyst) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Analyst profile not found. Please register as an analyst first.",
      });
    }

    // Generate earnings history (mock for now - in production, query from transactions)
    const earningsHistory = generateMockEarningsHistory(analyst);
    
    // Generate referral stats from database
    const referralStats = await generateReferralStats(analyst);

    return {
      analyst: {
        id: analyst.id,
        wallet: analyst.wallet,
        displayName: analyst.displayName,
        avatar: analyst.avatar,
        bio: analyst.bio,
        sport: analyst.sport,
        roi: analyst.roi,
        winRate: analyst.winRate,
        totalPredictions: analyst.totalPredictions,
        avgOdds: analyst.avgOdds,
        followersCount: analyst.followersCount,
        volumeGenerated: analyst.volumeGenerated,
        pendingRewards: analyst.pendingRewards,
        totalEarned: analyst.totalEarned,
        autoCompound: analyst.autoCompound,
        activityDays: analyst.activityDays,
        validFollowers: analyst.validFollowers,
        referralCode: analyst.referralCode,
        verificationTier: analyst.verificationTier,
        twitterUrl: analyst.twitterUrl,
        telegramUrl: analyst.telegramUrl,
        websiteUrl: analyst.websiteUrl,
      },
      earningsHistory,
      referralStats,
      feeRate: FEE_ANALYST, // Fixed 35% fee rate for all analysts
    };
  });

function generateMockEarningsHistory(analyst: any) {
  // TODO: In production, query from Transaction table where type = 'analyst_commission'
  const history = [];
  const days = 30;
  
  for (let i = days; i >= 0; i--) {
    const dailyEarnings = Math.random() * 100 + 20;
    
    history.push({
      date: Date.now() - i * 24 * 60 * 60 * 1000,
      earnings: dailyEarnings,
      volume: dailyEarnings * 40,
      followers: Math.floor(Math.random() * 5),
    });
  }
  
  return history;
}

async function generateReferralStats(analyst: any) {
  // Query all followers
  const allFollowers = await db.analystFollow.findMany({
    where: { analystId: analyst.id },
    include: {
      analyst: false,
    },
  });
  
  // For now, calculate basic stats
  // TODO: In production, join with User table to get actual volume and validation status
  const totalReferrals = allFollowers.length;
  
  // Mock calculation of valid followers (in production, check User.totalVolume >= 50)
  const validReferrals = analyst.validFollowers;
  const pendingReferrals = totalReferrals - validReferrals;
  const conversionRate = totalReferrals > 0 ? (validReferrals / totalReferrals) * 100 : 0;
  
  // Get top referrals (mock data for now)
  const topReferrals = allFollowers.slice(0, 3).map((follow, i) => ({
    wallet: `${follow.userWallet.slice(0, 6)}...${follow.userWallet.slice(-4)}`,
    volumeGenerated: Math.floor(Math.random() * 10000) + 5000,
    earnedFromUser: Math.floor(Math.random() * 150) + 50,
    joinedAt: follow.createdAt.getTime(),
  }));
  
  return {
    totalReferrals,
    validReferrals,
    pendingReferrals,
    conversionRate,
    topReferrals,
  };
}
