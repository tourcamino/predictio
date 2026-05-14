import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

const NotificationTypeEnum = z.enum([
  'MARKET_RESOLVED',
  'MARKET_REFUNDED',
  'POSITION_OPENED',
  'MARKET_CLOSING_SOON',
  'LEADERBOARD_CHANGE',
  'NEW_FOLLOWER',
  'FOLLOWER_MILESTONE',
  'VAULT_LOW_TVL',
  'VAULT_HIGH_UTILIZATION',
  'VAULT_LOW_DAILY_FEES',
]);

export const createNotification = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      type: NotificationTypeEnum,
      title: z.string(),
      message: z.string(),
      marketId: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { walletAddress, type, title, message, marketId } = input;
    
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Check for duplicate notifications (prevent spam)
    // Only allow 1 notification per type per market per user
    if (marketId) {
      const existing = await db.notification.findFirst({
        where: {
          walletAddress: normalizedAddress,
          type,
          marketId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });
      
      if (existing) {
        console.log(`[Notifications] Duplicate prevented: ${type} for market ${marketId}`);
        return { success: true, duplicate: true };
      }
    }
    
    // Create notification
    const notification = await db.notification.create({
      data: {
        walletAddress: normalizedAddress,
        type,
        title,
        message,
        marketId,
      },
    });
    
    console.log(`[Notifications] Created ${type} for ${normalizedAddress}`);
    
    return {
      success: true,
      notification,
    };
  });
