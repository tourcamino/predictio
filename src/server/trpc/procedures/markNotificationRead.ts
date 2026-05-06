import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const markNotificationRead = baseProcedure
  .input(
    z.object({
      notificationId: z.string(),
      walletAddress: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { notificationId, walletAddress } = input;
    
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Verify ownership and update
    const notification = await db.notification.findFirst({
      where: {
        id: notificationId,
        walletAddress: normalizedAddress,
      },
    });
    
    if (!notification) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Notification not found",
      });
    }
    
    await db.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
    
    return { success: true };
  });
