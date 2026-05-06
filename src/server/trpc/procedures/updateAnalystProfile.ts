import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const updateAnalystProfile = baseProcedure
  .input(
    z.object({
      wallet: z.string(),
      displayName: z.string().min(3).max(50).optional(),
      bio: z.string().max(500).optional(),
      avatar: z.string().emoji().optional(),
      autoCompound: z.boolean().optional(),
      twitterUrl: z.string().url().optional().or(z.literal('')),
      telegramUrl: z.string().url().optional().or(z.literal('')),
      websiteUrl: z.string().url().optional().or(z.literal('')),
    })
  )
  .mutation(async ({ input }) => {
    const normalizedWallet = input.wallet.toLowerCase();
    
    // Check if analyst exists
    const analyst = await db.analyst.findUnique({
      where: { wallet: normalizedWallet },
    });
    
    if (!analyst) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Analyst profile not found",
      });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (input.displayName !== undefined) updateData.displayName = input.displayName;
    if (input.bio !== undefined) updateData.bio = input.bio;
    if (input.avatar !== undefined) updateData.avatar = input.avatar;
    if (input.autoCompound !== undefined) updateData.autoCompound = input.autoCompound;
    if (input.twitterUrl !== undefined) updateData.twitterUrl = input.twitterUrl || null;
    if (input.telegramUrl !== undefined) updateData.telegramUrl = input.telegramUrl || null;
    if (input.websiteUrl !== undefined) updateData.websiteUrl = input.websiteUrl || null;

    // Update analyst profile
    await db.analyst.update({
      where: { wallet: normalizedWallet },
      data: updateData,
    });

    console.log(`[Analyst] Profile updated for ${normalizedWallet}`, updateData);

    return {
      success: true,
      message: "Profile updated successfully",
    };
  });
