import { db } from "../db";

/**
 * Clean up notifications older than 7 days
 * This helps prevent the notifications table from growing indefinitely
 */
export async function cleanupOldNotifications() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const result = await db.notification.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });
    
    if (result.count > 0) {
      console.log(`[Cleanup] Deleted ${result.count} notifications older than 7 days`);
    }
    
    return result.count;
  } catch (error) {
    console.error('[Cleanup] Failed to delete old notifications:', error);
    return 0;
  }
}
