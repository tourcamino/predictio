import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const completeOnboarding = baseProcedure
  .input(
    z.object({
      walletAddress: z.string().min(1, "Wallet address is required"),
    })
  )
  .mutation(async ({ input }) => {
    const { walletAddress } = input;
    
    // Normalize wallet address to lowercase for consistency
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Update user onboarding status
    const user = await db.user.update({
      where: { wallet: normalizedAddress },
      data: { onboardingCompleted: true },
    });
    
    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    
    console.log(`[Onboarding] Completed for ${normalizedAddress}`);
    
    return {
      success: true,
      onboardingCompleted: user.onboardingCompleted,
    };
  });
