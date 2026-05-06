import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const registerLPWaitlist = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { walletAddress } = input;
    const normalizedAddress = walletAddress.toLowerCase();

    // Check if already registered
    const existing = await db.lPWaitlist.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    if (existing) {
      return {
        success: true,
        alreadyRegistered: true,
        message: "You're already on the waitlist",
      };
    }

    // Register to waitlist
    const waitlistEntry = await db.lPWaitlist.create({
      data: {
        walletAddress: normalizedAddress,
        pointsCredited: true, // Mark as credited immediately
      },
    });

    // Credit 150 points for joining waitlist
    try {
      await db.pointsLedger.create({
        data: {
          walletAddress: normalizedAddress,
          actionType: "REFERRAL_CONVERTED", // Reuse existing type for now
          points: 150,
          metadata: {
            source: "lp_waitlist",
            registeredAt: waitlistEntry.registeredAt.toISOString(),
          },
        },
      });

      // Update points total
      const existingTotal = await db.pointsTotal.findUnique({
        where: { walletAddress: normalizedAddress },
      });

      const newTotal = (existingTotal?.totalPoints || 0) + 150;
      const newTier = 
        newTotal >= 20000 ? "DIAMOND" :
        newTotal >= 5000 ? "GOLD" :
        newTotal >= 1000 ? "SILVER" :
        "BRONZE";

      await db.pointsTotal.upsert({
        where: { walletAddress: normalizedAddress },
        create: {
          walletAddress: normalizedAddress,
          totalPoints: newTotal,
          season: 1,
          tier: newTier,
        },
        update: {
          totalPoints: newTotal,
          tier: newTier,
        },
      });

      console.log(
        `[LP Waitlist] ${normalizedAddress} registered. Credited 150 pts. New total: ${newTotal}`
      );
    } catch (error) {
      console.error("[LP Waitlist] Failed to credit points:", error);
      // Don't fail the registration if points credit fails
    }

    return {
      success: true,
      alreadyRegistered: false,
      message: "You're on the list. We'll notify you when external LPs can join.",
    };
  });
