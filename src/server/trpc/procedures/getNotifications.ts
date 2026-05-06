import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getNotifications = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      unreadOnly: z.boolean().optional(),
    })
  )
  .query(async ({ input }) => {
    const { walletAddress, limit, offset, unreadOnly } = input;
    
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Build where clause
    const where: any = {
      walletAddress: normalizedAddress,
    };
    
    if (unreadOnly) {
      where.read = false;
    }
    
    // Fetch notifications
    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    
    // Get total count
    const totalCount = await db.notification.count({ where });
    
    // Get unread count
    const unreadCount = await db.notification.count({
      where: {
        walletAddress: normalizedAddress,
        read: false,
      },
    });
    
    return {
      notifications,
      totalCount,
      unreadCount,
      hasMore: offset + notifications.length < totalCount,
    };
  });
