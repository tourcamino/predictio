import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getAnalystByReferralCode = baseProcedure
  .input(z.object({ referralCode: z.string() }))
  .query(async ({ input }) => {
    // Query analyst from database
    const analyst = await db.analyst.findUnique({
      where: { referralCode: input.referralCode },
    });
    
    if (!analyst) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid referral code",
      });
    }

    // Return public analyst info only
    return {
      id: analyst.id,
      displayName: analyst.displayName,
      avatar: analyst.avatar,
      bio: analyst.bio,
      sport: analyst.sport,
      tier: analyst.verificationTier,
      roi: analyst.roi,
      winRate: analyst.winRate,
      followersCount: analyst.followersCount,
      referralCode: analyst.referralCode,
    };
  });
