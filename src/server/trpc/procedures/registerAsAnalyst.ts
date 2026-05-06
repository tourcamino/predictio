import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const registerAsAnalyst = baseProcedure
  .input(
    z.object({
      wallet: z.string().min(1, "Wallet address is required"),
      displayName: z.string().min(3).max(50),
      bio: z.string().max(500).optional(),
      avatar: z.string().emoji().optional(),
      sport: z.array(z.string()).min(1, "At least one sport is required"),
    })
  )
  .mutation(async ({ input }) => {
    const normalizedWallet = input.wallet.toLowerCase();
    
    // Check if analyst profile already exists
    const existingAnalyst = await db.analyst.findUnique({
      where: { wallet: normalizedWallet },
    });
    
    if (existingAnalyst) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You already have an analyst profile",
      });
    }
    
    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode();
    
    // Create analyst profile
    const analyst = await db.analyst.create({
      data: {
        wallet: normalizedWallet,
        displayName: input.displayName,
        bio: input.bio || "Sports analyst on Predictio",
        avatar: input.avatar || "🎯",
        sport: input.sport,
        roi: 0,
        winRate: 0,
        totalPredictions: 0,
        avgOdds: 0,
        followersCount: 0,
        volumeGenerated: 0,
        pendingRewards: 0,
        totalEarned: 0,
        autoCompound: false,
        activityDays: 0,
        validFollowers: 0,
        onchainRegistered: false,
        referralCode,
      },
    });
    
    console.log(`[Analyst] New analyst registered: ${normalizedWallet} with referral code: ${referralCode}`);
    
    return {
      success: true,
      analyst: {
        id: analyst.id,
        wallet: analyst.wallet,
        displayName: analyst.displayName,
        referralCode: analyst.referralCode,
      },
    };
  });

async function generateUniqueReferralCode(): Promise<string> {
  const maxAttempts = 10;
  
  for (let i = 0; i < maxAttempts; i++) {
    // Generate 6-8 character alphanumeric uppercase code
    const length = 6 + Math.floor(Math.random() * 3); // 6, 7, or 8 chars
    const code = Math.random().toString(36).substring(2, 2 + length).toUpperCase();
    
    // Check if code already exists
    const existing = await db.analyst.findUnique({
      where: { referralCode: code },
    });
    
    if (!existing) {
      return code;
    }
  }
  
  // Fallback to timestamp-based code if all attempts fail
  const timestamp = Date.now().toString(36).toUpperCase();
  return timestamp.substring(timestamp.length - 8);
}
