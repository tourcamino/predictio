import type { PrismaClient } from "@prisma/client";
import {
  creditLoginStreakBonusesIfEligible,
  creditWalletPoints,
  POINT_ACTION_VALUES,
} from "./pointsLedgerWeb";

async function attributeReferralForNewUser(
  prisma: PrismaClient,
  normalizedAddress: string,
  referralCode: string,
): Promise<void> {
  try {
    const [analyst, affiliate] = await Promise.all([
      prisma.analyst.findUnique({
        where: { referralCode },
      }),
      prisma.affiliate.findUnique({
        where: { refCode: referralCode },
      }),
    ]);

    if (analyst) {
      const existingFollow = await prisma.analystFollow.findUnique({
        where: {
          userWallet_analystId: {
            userWallet: normalizedAddress,
            analystId: analyst.id,
          },
        },
      });

      if (!existingFollow) {
        await prisma.$transaction([
          prisma.analystFollow.create({
            data: {
              userWallet: normalizedAddress,
              analystId: analyst.id,
            },
          }),
          prisma.analyst.update({
            where: { id: analyst.id },
            data: {
              followersCount: { increment: 1 },
            },
          }),
        ]);
      }
    }

    if (affiliate) {
      const existingTracking = await prisma.referralTracking.findUnique({
        where: { referredWallet: normalizedAddress },
      });

      if (!existingTracking) {
        const cookieExpires = new Date();
        cookieExpires.setDate(
          cookieExpires.getDate() +
            parseInt(process.env.REFERRAL_COOKIE_DAYS || "120"),
        );

        await prisma.$transaction([
          prisma.referralTracking.create({
            data: {
              refCode: referralCode,
              referredWallet: normalizedAddress,
              attributedAt: new Date(),
              cookieExpires,
              isActive: true,
            },
          }),
          prisma.affiliate.update({
            where: { walletAddress: affiliate.walletAddress },
            data: {
              totalReferrals: { increment: 1 },
            },
          }),
        ]);
      }
    } else if (!analyst) {
      console.warn(`[REFERRAL] Invalid referral code: ${referralCode}`);
    }
  } catch (error) {
    console.error("[REFERRAL] Failed to attribute referral:", error);
  }
}

async function creditWalletLoginPointsAndStreak(
  prisma: PrismaClient,
  normalizedAddress: string,
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [walletConnectedEntry, todayLoginEntry] = await Promise.all([
    prisma.pointsLedger.findFirst({
      where: {
        walletAddress: normalizedAddress,
        actionType: "WALLET_CONNECTED",
      },
    }),
    prisma.pointsLedger.findFirst({
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
        prisma,
        normalizedAddress,
        "WALLET_CONNECTED",
        POINT_ACTION_VALUES.WALLET_CONNECTED,
        {},
      );
    } catch (error) {
      console.error("[Points] Failed to credit WALLET_CONNECTED:", error);
    }
  }

  let hadLoginToday = !!todayLoginEntry;
  if (!todayLoginEntry) {
    try {
      await creditWalletPoints(
        prisma,
        normalizedAddress,
        "DAILY_LOGIN",
        POINT_ACTION_VALUES.DAILY_LOGIN,
        {},
      );
      hadLoginToday = true;
    } catch (error) {
      console.error("[Points] Failed to credit DAILY_LOGIN:", error);
    }
  }

  if (hadLoginToday) {
    try {
      await creditLoginStreakBonusesIfEligible(prisma, normalizedAddress, today);
    } catch (error) {
      console.error("[Points] Failed streak bonus check:", error);
    }
  }
}

export async function runSyncUserAccountWeb(
  prisma: PrismaClient,
  input: { walletAddress: string; referralCode?: string },
) {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const normalizedAddress = input.walletAddress.toLowerCase();

  const existingBefore = await prisma.user.findUnique({
    where: { wallet: normalizedAddress },
  });
  const isNewUser = !existingBefore;

  const user = await prisma.user.upsert({
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

  const referralPromise =
    input.referralCode && isNewUser
      ? attributeReferralForNewUser(prisma, normalizedAddress, input.referralCode)
      : Promise.resolve();

  const pointsPromise = creditWalletLoginPointsAndStreak(prisma, normalizedAddress);

  await Promise.all([referralPromise, pointsPromise]);

  return {
    isNewUser,
    virtualBalance: user.virtualBalance,
    totalPnl: user.totalPnl,
    tradesCount: user.tradesCount,
    onboardingCompleted: user.onboardingCompleted,
  };
}
