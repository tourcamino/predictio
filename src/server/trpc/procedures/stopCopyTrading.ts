import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const stopCopyTrading = baseProcedure
  .input(
    z.object({
      copierWallet: z.string(),
      analystWallet: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const copierWallet = input.copierWallet.toLowerCase();
    const analystWallet = input.analystWallet.toLowerCase();
    
    // Find existing relationship
    const relationship = await db.copyRelationship.findUnique({
      where: {
        copierWallet_analystWallet: {
          copierWallet,
          analystWallet,
        },
      },
    });
    
    if (!relationship) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Copy trading relationship not found",
      });
    }
    
    // Update to inactive
    const updated = await db.copyRelationship.update({
      where: { id: relationship.id },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });
    
    console.log(`[COPY TRADING] Stopped copy relationship: ${copierWallet} -> ${analystWallet}`);
    
    return {
      success: true,
      message: "Copy trading stopped successfully",
      relationship: updated,
    };
  });
