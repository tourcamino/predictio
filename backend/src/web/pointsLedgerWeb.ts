import type { Prisma, PrismaClient } from "@prisma/client";
import { countConsecutiveLoginStreakDays, localDayKey } from "./pointsPure";

export const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 1000,
  GOLD: 5000,
  DIAMOND: 20000,
} as const;

export function calculateTier(points: number): string {
  if (points >= TIER_THRESHOLDS.DIAMOND) return "DIAMOND";
  if (points >= TIER_THRESHOLDS.GOLD) return "GOLD";
  if (points >= TIER_THRESHOLDS.SILVER) return "SILVER";
  return "BRONZE";
}

export const POINT_ACTION_VALUES = {
  WALLET_CONNECTED: 100,
  LP_WAITLIST_JOINED: 150,
  FIRST_TRADE: 500,
  TRADE_PLACED: 50,
  DAILY_LOGIN: 25,
  MARKET_RESOLVED_WIN: 200,
  LIQUIDITY_ADDED: 10,
  STREAK_7_DAYS: 350,
  STREAK_30_DAYS: 2000,
  REFERRAL_CONVERTED: 200,
  TRADE_CLOSED: 25,
  DEPOSIT_COMPLETED: 20,
  WITHDRAW_COMPLETED: 10,
} as const;

export type PointsEarnGuideEntry = {
  actionType: string;
  label: string;
  pointsLabel: string;
  repeatable: boolean;
};

export const POINTS_EARN_GUIDE: PointsEarnGuideEntry[] = [
  { actionType: "WALLET_CONNECTED", label: "Connect your wallet", pointsLabel: "+100 pts", repeatable: false },
  { actionType: "LP_WAITLIST_JOINED", label: "Join the LP waitlist", pointsLabel: "+150 pts", repeatable: false },
  { actionType: "DAILY_LOGIN", label: "Daily login", pointsLabel: "+25 pts", repeatable: true },
  { actionType: "FIRST_TRADE", label: "First trade bonus", pointsLabel: "+500 pts", repeatable: false },
  { actionType: "TRADE_PLACED", label: "Open or add to a position", pointsLabel: "+50 pts each", repeatable: true },
  { actionType: "TRADE_CLOSED", label: "Close or reduce a position", pointsLabel: "+25 pts each", repeatable: true },
  { actionType: "DEPOSIT_COMPLETED", label: "Paper deposit (USDC)", pointsLabel: "+20 pts each", repeatable: true },
  { actionType: "WITHDRAW_COMPLETED", label: "Paper withdrawal (USDC)", pointsLabel: "+10 pts each", repeatable: true },
  { actionType: "MARKET_RESOLVED_WIN", label: "Win a resolved market", pointsLabel: "+200 pts each", repeatable: true },
  { actionType: "LIQUIDITY_ADDED", label: "Add liquidity", pointsLabel: "10 pts per $10 USDC", repeatable: true },
  { actionType: "REFERRAL_CONVERTED", label: "Referral completes first trade", pointsLabel: "+200 pts", repeatable: true },
  { actionType: "STREAK_7_DAYS", label: "7-day login streak", pointsLabel: "+350 pts", repeatable: false },
  { actionType: "STREAK_30_DAYS", label: "30-day login streak", pointsLabel: "+2,000 pts", repeatable: false },
];

export async function creditWalletPoints(
  prisma: PrismaClient,
  walletAddress: string,
  actionType: string,
  points: number,
  metadata?: Prisma.InputJsonValue,
) {
  const w = walletAddress.toLowerCase();
  if (points <= 0) {
    const row = await prisma.pointsTotal.findUnique({ where: { walletAddress: w } });
    return {
      newTotal: row?.totalPoints ?? 0,
      tier: row?.tier ?? calculateTier(0),
    };
  }

  await prisma.pointsLedger.create({
    data: {
      walletAddress: w,
      actionType,
      points,
      metadata: metadata ?? {},
    },
  });

  const row = await prisma.pointsTotal.findUnique({ where: { walletAddress: w } });
  const newTotal = (row?.totalPoints ?? 0) + points;
  const tier = calculateTier(newTotal);

  await prisma.pointsTotal.upsert({
    where: { walletAddress: w },
    create: {
      walletAddress: w,
      totalPoints: newTotal,
      season: 1,
      tier,
    },
    update: {
      totalPoints: newTotal,
      tier,
    },
  });

  return { newTotal, tier };
}

export async function creditLoginStreakBonusesIfEligible(
  prisma: PrismaClient,
  walletAddress: string,
  todayStart: Date,
): Promise<void> {
  const w = walletAddress.toLowerCase();

  const [loginRows, existingStreak] = await Promise.all([
    prisma.pointsLedger.findMany({
      where: { walletAddress: w, actionType: "DAILY_LOGIN" },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.pointsLedger.findMany({
      where: {
        walletAddress: w,
        actionType: { in: ["STREAK_7_DAYS", "STREAK_30_DAYS"] },
      },
      select: { actionType: true },
    }),
  ]);

  const loginDayKeys = new Set(loginRows.map((r) => localDayKey(r.createdAt)));
  const streak = countConsecutiveLoginStreakDays(todayStart, loginDayKeys);
  const has7 = existingStreak.some((x) => x.actionType === "STREAK_7_DAYS");
  const has30 = existingStreak.some((x) => x.actionType === "STREAK_30_DAYS");

  if (streak >= 7 && !has7) {
    try {
      await creditWalletPoints(prisma, w, "STREAK_7_DAYS", POINT_ACTION_VALUES.STREAK_7_DAYS, {
        streakDays: streak,
      });
    } catch (e) {
      console.error("[Points] Failed to credit STREAK_7_DAYS:", e);
    }
  }

  if (streak >= 30 && !has30) {
    try {
      await creditWalletPoints(prisma, w, "STREAK_30_DAYS", POINT_ACTION_VALUES.STREAK_30_DAYS, {
        streakDays: streak,
      });
    } catch (e) {
      console.error("[Points] Failed to credit STREAK_30_DAYS:", e);
    }
  }
}
