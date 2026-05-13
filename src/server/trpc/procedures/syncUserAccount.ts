import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { env } from "~/server/env";
import {
  creditWalletPoints,
  POINT_ACTION_VALUES,
  creditLoginStreakBonusesIfEligible,
} from "~/server/utils/pointsLedger";

async function attributeReferralForNewUser(
  normalizedAddress: string,
  referralCode: string,
): Promise<void> {
  try {
    const [analyst, affiliate] = await Promise.all([
      db.analyst.findUnique({
        where: { referralCode },
      }),
      db.affiliate.findUnique({
        where: { refCode: referralCode },
      }),
    ]);

    if (analyst) {
      const existingFollow = await db.analystFollow.findUnique({
        where: {
          userWallet_analystId: {
            userWallet: normalizedAddress,
            analystId: analyst.id,
          },
        },
      });

      if (!existingFollow) {
        await db.$transaction([
          db.analystFollow.create({
            data: {
              userWallet: normalizedAddress,
              analystId: analyst.id,
            },
          }),
          db.analyst.update({
            where: { id: analyst.id },
            data: {
              followersCount: { increment: 1 },
            },
          }),
        ]);

        console.log(
          `[REFERRAL] User ${normalizedAddress} attributed to analyst ${analyst.displayName} (${analyst.wallet}) via referral code ${referralCode}`,
        );
      }
    }

    if (affiliate) {
      const existingTracking = await db.referralTracking.findUnique({
        where: { referredWallet: normalizedAddress },
      });

      if (!existingTracking) {
        const cookieExpires = new Date();
        cookieExpires.setDate(
          cookieExpires.getDate() +
            parseInt(process.env.REFERRAL_COOKIE_DAYS || "120"),
        );

        await db.$transaction([
          db.referralTracking.create({
            data: {
              refCode: referralCode,
              referredWallet: normalizedAddress,
              attributedAt: new Date(),
              cookieExpires,
              isActive: true,
            },
          }),
          db.affiliate.update({
            where: { walletAddress: affiliate.walletAddress },
            data: {
              totalReferrals: { increment: 1 },
            },
          }),
        ]);

        console.log(
          `[REFERRAL] Created referral tracking: ${normalizedAddress} referred by ${affiliate.walletAddress} (code: ${referralCode})`,
        );
      }
    } else if (!analyst) {
      console.warn(`[REFERRAL] Invalid referral code: ${referralCode}`);
    }
  } catch (error) {
    console.error("[REFERRAL] Failed to attribute referral:", error);
  }
}

async function creditWalletLoginPointsAndStreak(
  normalizedAddress: string,
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [walletConnectedEntry, todayLoginEntry] = await Promise.all([
    db.pointsLedger.findFirst({
      where: {
        walletAddress: normalizedAddress,
        actionType: "WALLET_CONNECTED",
      },
    }),
    db.pointsLedger.findFirst({
      where: {
        walletAddress: normalizedAddress,
        actionType: "DAILY_LOGIN",
        createdAt: { gte: today },
      },
    }),
  ]);

  if (!walletConnectedEntry) {
    try {
      await creditWalletPoints(
        normalizedAddress,
        "WALLET_CONNECTED",
        POINT_ACTION_VALUES.WALLET_CONNECTED,
        {},
      );
      console.log(
        `[Points] Credited ${POINT_ACTION_VALUES.WALLET_CONNECTED} pts to ${normalizedAddress} for WALLET_CONNECTED`,
      );
    } catch (error) {
      console.error("[Points] Failed to credit WALLET_CONNECTED:", error);
    }
  }

  let hadLoginToday = !!todayLoginEntry;
  if (!todayLoginEntry) {
    try {
      await creditWalletPoints(
        normalizedAddress,
        "DAILY_LOGIN",
        POINT_ACTION_VALUES.DAILY_LOGIN,
        {},
      );
      console.log(
        `[Points] Credited ${POINT_ACTION_VALUES.DAILY_LOGIN} pts to ${normalizedAddress} for DAILY_LOGIN`,
      );
      hadLoginToday = true;
    } catch (error) {
      console.error("[Points] Failed to credit DAILY_LOGIN:", error);
    }
  }

  if (hadLoginToday) {
    try {
      await creditLoginStreakBonusesIfEligible(normalizedAddress, today);
    } catch (error) {
      console.error("[Points] Failed streak bonus check:", error);
    }
  }
}

export const syncUserAccount = baseProcedure
  .input(
    z.object({
      walletAddress: z.string().min(1, "Wallet address is required"),
      referralCode: z.string().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { walletAddress } = input;

    if (!env.DATABASE_URL?.trim()) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "DATABASE_URL is not configured on this server. Wallet sync cannot run.",
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    const existingBefore = await db.user.findUnique({
      where: { wallet: normalizedAddress },
    });
    const isNewUser = !existingBefore;

    const user = await db.user.upsert({
      where: { wallet: normalizedAddress },
      create: {
        wallet: normalizedAddress,
        virtualBalance: 1000.0,
        totalPnl: 0,
        tradesCount: 0,
        firstSeen: new Date(),
        lastActive: new Date(),
        totalVolume: 0,
        predictions: 0,
        wins: 0,
        losses: 0,
      },
      update: {
        lastActive: new Date(),
      },
    });

    if (isNewUser) {
      console.log(
        `[Paper Trading] New account created for ${normalizedAddress} with $1,000 virtual balance`,
      );
    }

    const referralPromise =
      input.referralCode && isNewUser
        ? attributeReferralForNewUser(normalizedAddress, input.referralCode)
        : Promise.resolve();

    const pointsPromise = creditWalletLoginPointsAndStreak(normalizedAddress);

    await Promise.all([referralPromise, pointsPromise]);

    return {
      isNewUser,
      virtualBalance: user.virtualBalance,
      totalPnl: user.totalPnl,
      tradesCount: user.tradesCount,
      onboardingCompleted: user.onboardingCompleted,
    };
  });
