import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const markAllNotificationsRead = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { walletAddress } = input;
    
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Update all unread notifications for this wallet
    const result = await db.notification.updateMany({
      where: {
        walletAddress: normalizedAddress,
        read: false,
      },
      data: { read: true },
    });
    
    console.log(`[Notifications] Marked ${result.count} notifications as read for ${normalizedAddress}`);
    
    return {
      success: true,
      count: result.count,
    };
  });
