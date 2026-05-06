import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const toggleLPAutoCompound = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      enabled: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    const { walletAddress, enabled } = input;

    // Find the user's active Protocol Vault position
    const position = await db.liquidityPosition.findFirst({
      where: {
        marketId: 'protocol-vault',
        userWallet: walletAddress.toLowerCase(),
        status: 'active',
      },
    });

    if (!position) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active Protocol Vault position found. You must deposit first.",
      });
    }

    // Update the auto-compound setting
    await db.liquidityPosition.update({
      where: {
        id: position.id,
      },
      data: {
        autoCompound: enabled,
      },
    });

    // Create notification
    try {
      await db.notification.create({
        data: {
          walletAddress: walletAddress.toLowerCase(),
          type: 'LP_SETTINGS_UPDATED',
          title: enabled ? '🔄 Auto-Compound Enabled' : '⏸️ Auto-Compound Disabled',
          message: enabled
            ? 'Your LP fees will now be automatically reinvested into the Protocol Vault to maximize returns.'
            : 'Your LP fees will now accumulate in your pending balance. You can claim them manually.',
        },
      });
    } catch (notifError) {
      console.error('[Auto-Compound] Failed to create notification:', notifError);
      // Don't fail the operation if notification fails
    }

    return {
      success: true,
      autoCompound: enabled,
      positionId: position.id,
    };
  });
