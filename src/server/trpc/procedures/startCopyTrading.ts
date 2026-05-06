import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const startCopyTrading = baseProcedure
  .input(
    z.object({
      copierWallet: z.string(),
      analystWallet: z.string(),
      maxPerTradeUsd: z.number().min(10).max(10000),
      copyMode: z.enum(['all', 'selective']).default('all'),
      selectedMarkets: z.array(z.string()).default([]),
    })
  )
  .mutation(async ({ input }) => {
    const copierWallet = input.copierWallet.toLowerCase();
    const analystWallet = input.analystWallet.toLowerCase();
    
    // Validate analyst exists
    const analyst = await db.analyst.findUnique({
      where: { wallet: analystWallet },
    });
    
    if (!analyst) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Analyst not found",
      });
    }
    
    // Validate copier has sufficient balance
    const copier = await db.user.findUnique({
      where: { wallet: copierWallet },
    });
    
    if (!copier) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    
    if (copier.virtualBalance < input.maxPerTradeUsd) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Insufficient balance for copy trading",
      });
    }
    
    // Check if relationship already exists
    const existing = await db.copyRelationship.findUnique({
      where: {
        copierWallet_analystWallet: {
          copierWallet,
          analystWallet,
        },
      },
    });
    
    if (existing) {
      // Update existing relationship
      const updated = await db.copyRelationship.update({
        where: { id: existing.id },
        data: {
          maxPerTradeUsd: input.maxPerTradeUsd,
          copyMode: input.copyMode,
          selectedMarkets: input.selectedMarkets,
          isActive: true,
          endedAt: null, // Clear endedAt if reactivating
        },
      });
      
      console.log(`[COPY TRADING] Updated copy relationship: ${copierWallet} -> ${analystWallet}`);
      
      return {
        success: true,
        message: "Copy trading settings updated",
        relationship: updated,
      };
    }
    
    // Create new relationship
    const relationship = await db.copyRelationship.create({
      data: {
        copierWallet,
        analystWallet,
        maxPerTradeUsd: input.maxPerTradeUsd,
        copyMode: input.copyMode,
        selectedMarkets: input.selectedMarkets,
        isActive: true,
        totalVolumeCopied: 0,
      },
    });
    
    console.log(`[COPY TRADING] Created copy relationship: ${copierWallet} -> ${analystWallet}`);
    
    // Create notification for analyst
    await db.notification.create({
      data: {
        walletAddress: analystWallet,
        type: 'NEW_COPIER',
        title: 'New Copier',
        message: `Someone started copying your trades with $${input.maxPerTradeUsd} per trade`,
      },
    }).catch((err) => {
      console.error('[COPY TRADING] Failed to create analyst notification:', err);
    });
    
    return {
      success: true,
      message: "Copy trading started successfully",
      relationship,
    };
  });
