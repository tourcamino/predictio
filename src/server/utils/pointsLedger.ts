import type { Prisma } from "@prisma/client";
import { db } from "~/server/db";

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

/** Canonical amounts for documented actions (admin `creditPoints` uses the same where types overlap). */
export const POINT_ACTION_VALUES = {
  WALLET_CONNECTED: 100,
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

export type PointActionValueKey = keyof typeof POINT_ACTION_VALUES;

export type PointsEarnGuideEntry = {
  actionType: string;
  label: string;
  /** Shown next to the row, e.g. "+50 pts" or "10 pts per $10 USDC" */
  pointsLabel: string;
  repeatable: boolean;
};

/** Single source for Account "How to earn" — keep labels aligned with real ledger `actionType` strings. */
export const POINTS_EARN_GUIDE: PointsEarnGuideEntry[] = [
  {
    actionType: "WALLET_CONNECTED",
    label: "Connect your wallet",
    pointsLabel: "+100 pts",
    repeatable: false,
  },
  {
    actionType: "LP_WAITLIST_JOINED",
    label: "Join the LP waitlist",
    pointsLabel: "+150 pts",
    repeatable: false,
  },
  {
    actionType: "DAILY_LOGIN",
    label: "Daily login",
    pointsLabel: "+25 pts",
    repeatable: true,
  },
  {
    actionType: "FIRST_TRADE",
    label: "First trade bonus",
    pointsLabel: "+500 pts",
    repeatable: false,
  },
  {
    actionType: "TRADE_PLACED",
    label: "Open or add to a position",
    pointsLabel: "+50 pts each",
    repeatable: true,
  },
  {
    actionType: "TRADE_CLOSED",
    label: "Close or reduce a position",
    pointsLabel: "+25 pts each",
    repeatable: true,
  },
  {
    actionType: "DEPOSIT_COMPLETED",
    label: "Paper deposit (USDC)",
    pointsLabel: "+20 pts each",
    repeatable: true,
  },
  {
    actionType: "WITHDRAW_COMPLETED",
    label: "Paper withdrawal (USDC)",
    pointsLabel: "+10 pts each",
    repeatable: true,
  },
  {
    actionType: "MARKET_RESOLVED_WIN",
    label: "Win a resolved market",
    pointsLabel: "+200 pts each",
    repeatable: true,
  },
  {
    actionType: "LIQUIDITY_ADDED",
    label: "Add liquidity",
    pointsLabel: "10 pts per $10 USDC",
    repeatable: true,
  },
  {
    actionType: "REFERRAL_CONVERTED",
    label: "Referral completes first trade",
    pointsLabel: "+200 pts",
    repeatable: true,
  },
  {
    actionType: "STREAK_7_DAYS",
    label: "7-day login streak",
    pointsLabel: "+350 pts",
    repeatable: false,
  },
  {
    actionType: "STREAK_30_DAYS",
    label: "30-day login streak",
    pointsLabel: "+2,000 pts",
    repeatable: false,
  },
];

/**
 * Append a ledger row and bump `PointsTotal` + tier. Safe to call from mutations after main work succeeds.
 */
export async function creditWalletPoints(
  walletAddress: string,
  actionType: string,
  points: number,
  metadata?: Prisma.InputJsonValue,
) {
  const w = walletAddress.toLowerCase();
  if (points <= 0) {
    const row = await db.pointsTotal.findUnique({ where: { walletAddress: w } });
    return {
      newTotal: row?.totalPoints ?? 0,
      tier: row?.tier ?? calculateTier(0),
    };
  }

  await db.pointsLedger.create({
    data: {
      walletAddress: w,
      actionType,
      points,
      metadata: metadata ?? {},
    },
  });

  const row = await db.pointsTotal.findUnique({ where: { walletAddress: w } });
  const newTotal = (row?.totalPoints ?? 0) + points;
  const tier = calculateTier(newTotal);

  await db.pointsTotal.upsert({
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
