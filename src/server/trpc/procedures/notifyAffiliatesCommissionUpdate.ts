import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

const TIER_RATES: Record<
  string,
  { old: number; new: number }
> = {
  trusted: { old: 15, new: 30 },
  elite: { old: 30, new: 50 },
  partner: { old: 25, new: 40 },
  bronze: { old: 15, new: 30 },
  silver: { old: 20, new: 35 },
  gold: { old: 25, new: 40 },
};

export const notifyAffiliatesCommissionUpdate = baseProcedure
  .input(
    z.object({
      adminKey: z.string().optional(),
    }),
  )
  .mutation(async () => {
    console.log("[Notifications] Starting commission update notifications...");

    const analysts = await db.analyst.findMany({
      select: {
        wallet: true,
        displayName: true,
        verificationTier: true,
      },
    });

    console.log(`[Notifications] Found ${analysts.length} analysts to notify`);

    let notificationsSent = 0;
    let duplicatesSkipped = 0;

    for (const analyst of analysts) {
      try {
        const existing = await db.notification.findFirst({
          where: {
            walletAddress: analyst.wallet.toLowerCase(),
            type: "COMMISSION_UPDATE",
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        });

        if (existing) {
          duplicatesSkipped++;
          continue;
        }

        const tierKey =
          (analyst.verificationTier ?? "trusted").toLowerCase();
        const commissionInfo =
          TIER_RATES[tierKey] ?? { old: 15, new: 30 };

        await db.notification.create({
          data: {
            walletAddress: analyst.wallet.toLowerCase(),
            type: "COMMISSION_UPDATE",
            title: "🎉 Commission Rates Increased!",
            message: `Great news! Your ${tierKey} tier commission rate has increased from ${commissionInfo.old}% to ${commissionInfo.new}%. Start earning more from your referrals today!`,
            read: false,
          },
        });

        notificationsSent++;
      } catch (error) {
        console.error(
          `[Notifications] Error notifying analyst ${analyst.wallet}:`,
          error,
        );
      }
    }

    return {
      success: true,
      notificationsSent,
      duplicatesSkipped,
      totalAnalysts: analysts.length,
    };
  });
