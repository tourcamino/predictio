import type { Prisma } from "@prisma/client";
import { db } from "~/server/db";

/** Ledger rows with 0 points: satisfy syncUserAccount existence checks without awarding points. */
const BARRIER_METADATA: Prisma.InputJsonValue = {
  paperResetBarrier: true,
};

export type PaperWalletHardResetCounts = {
  orders: number;
  transactions: number;
  lpPositions: number;
  copyAsCopier: number;
  copyAsAnalyst: number;
  notifications: number;
  pointsLedger: number;
  pointsTotal: number;
  leaderboard: number;
  treasuryLogsWalletFrom: number;
  apiKeys: number;
  authChallenges: number;
  analystFollowersOfWallet: number;
};

async function collectCounts(wallet: string): Promise<PaperWalletHardResetCounts> {
  const analyst = await db.analyst.findUnique({
    where: { wallet },
    select: { id: true },
  });

  const [
    orders,
    transactions,
    lpPositions,
    copyAsCopier,
    copyAsAnalyst,
    notifications,
    pointsLedger,
    pointsTotal,
    leaderboard,
    treasuryLogsWalletFrom,
    apiKeys,
    authChallenges,
    analystFollowersOfWallet,
  ] = await Promise.all([
    db.order.count({ where: { wallet } }),
    db.transaction.count({ where: { wallet } }),
    db.liquidityPosition.count({ where: { userWallet: wallet } }),
    db.copyRelationship.count({ where: { copierWallet: wallet } }),
    db.copyRelationship.count({ where: { analystWallet: wallet } }),
    db.notification.count({ where: { walletAddress: wallet } }),
    db.pointsLedger.count({ where: { walletAddress: wallet } }),
    db.pointsTotal.count({ where: { walletAddress: wallet } }),
    db.leaderboard.count({ where: { walletAddress: wallet } }),
    db.treasuryLog.count({ where: { walletFrom: wallet } }),
    db.apiKey.count({ where: { walletAddress: wallet } }),
    db.authChallenge.count({ where: { walletAddress: wallet } }),
    analyst
      ? db.analystFollow.count({ where: { analystId: analyst.id } })
      : 0,
  ]);

  return {
    orders,
    transactions,
    lpPositions,
    copyAsCopier,
    copyAsAnalyst,
    notifications,
    pointsLedger,
    pointsTotal,
    leaderboard,
    treasuryLogsWalletFrom,
    apiKeys,
    authChallenges,
    analystFollowersOfWallet,
  };
}

export type RunPaperWalletHardResetArgs = {
  walletLower: string;
  /** Paper trading slice (default 1000 in caller). */
  tradingUsd: number;
  /** Optional extra USDC on same User.virtualBalance (default 0 in caller). */
  lpTopup: number;
};

export type RunPaperWalletHardResetResult = {
  wallet: string;
  newVirtualBalance: number;
  countsBefore: PaperWalletHardResetCounts;
  countsAfter: PaperWalletHardResetCounts;
  userSnapshot: {
    virtualBalance: number;
    predictions: number;
    tradesCount: number;
    onboardingCompleted: boolean;
  } | null;
};

/**
 * Single-transaction hard reset for one allowlisted paper wallet.
 * Caller must enforce allowlist / env before invoking.
 */
export async function runPaperWalletHardReset(
  args: RunPaperWalletHardResetArgs,
): Promise<RunPaperWalletHardResetResult> {
  const wallet = args.walletLower.trim().toLowerCase();
  const newVirtualBalance = args.tradingUsd + args.lpTopup;

  const countsBefore = await collectCounts(wallet);

  await db.$transaction(async (tx) => {
    await tx.copyRelationship.deleteMany({
      where: { OR: [{ copierWallet: wallet }, { analystWallet: wallet }] },
    });

    await tx.apiKey.deleteMany({ where: { walletAddress: wallet } });
    await tx.authChallenge.deleteMany({ where: { walletAddress: wallet } });

    await tx.transaction.deleteMany({ where: { wallet } });
    await tx.order.deleteMany({ where: { wallet } });

    await tx.liquidityPosition.deleteMany({ where: { userWallet: wallet } });

    await tx.notification.deleteMany({ where: { walletAddress: wallet } });
    await tx.watchlist.deleteMany({ where: { walletAddress: wallet } });
    await tx.priceAlert.deleteMany({ where: { walletAddress: wallet } });
    await tx.pointsLedger.deleteMany({ where: { walletAddress: wallet } });
    await tx.pointsTotal.deleteMany({ where: { walletAddress: wallet } });
    await tx.leaderboard.deleteMany({ where: { walletAddress: wallet } });

    await tx.analystFollow.deleteMany({ where: { userWallet: wallet } });

    const analyst = await tx.analyst.findUnique({
      where: { wallet },
      select: { id: true },
    });
    if (analyst) {
      await tx.analystFollow.deleteMany({ where: { analystId: analyst.id } });
      await tx.analyst.update({
        where: { id: analyst.id },
        data: {
          roi: 0,
          winRate: 0,
          totalPredictions: 0,
          avgOdds: 0,
          followersCount: 0,
          volumeGenerated: 0,
          pendingRewards: 0,
          totalEarned: 0,
          activityDays: 0,
          validFollowers: 0,
        },
      });
    }

    await tx.appeal.deleteMany({ where: { userWallet: wallet } });
    await tx.referralTracking.deleteMany({ where: { referredWallet: wallet } });
    await tx.affiliateReward.deleteMany({ where: { walletAddress: wallet } });
    await tx.payoutLog.deleteMany({ where: { walletAddress: wallet } });
    await tx.lPWaitlist.deleteMany({ where: { walletAddress: wallet } });
    await tx.treasuryLog.deleteMany({ where: { walletFrom: wallet } });

    await tx.affiliate.updateMany({
      where: { walletAddress: wallet },
      data: {
        totalReferrals: 0,
        totalVolumeUsd: 0,
        totalRewardsUsd: 0,
        pendingRewardsUsd: 0,
        pendingRewardsEur: 0,
        lastPayoutAt: null,
      },
    });

    await tx.user.upsert({
      where: { wallet },
      create: {
        wallet,
        virtualBalance: newVirtualBalance,
        totalPnl: 0,
        tradesCount: 0,
        predictions: 0,
        wins: 0,
        losses: 0,
        totalVolume: 0,
        pendingHoldingRewards: 0,
        claimedHoldingRewards: 0,
        firstSeen: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      },
      update: {
        virtualBalance: newVirtualBalance,
        totalPnl: 0,
        tradesCount: 0,
        predictions: 0,
        wins: 0,
        losses: 0,
        totalVolume: 0,
        pendingHoldingRewards: 0,
        claimedHoldingRewards: 0,
        lastActive: new Date(),
        firstSeen: new Date(),
        onboardingCompleted: false,
      },
    });

    await tx.pointsTotal.create({
      data: {
        walletAddress: wallet,
        totalPoints: 0,
        season: 1,
        tier: "BRONZE",
      },
    });

    await tx.pointsLedger.createMany({
      data: [
        {
          walletAddress: wallet,
          actionType: "WALLET_CONNECTED",
          points: 0,
          metadata: BARRIER_METADATA,
        },
        {
          walletAddress: wallet,
          actionType: "DAILY_LOGIN",
          points: 0,
          metadata: BARRIER_METADATA,
        },
      ],
    });
  });

  const countsAfter = await collectCounts(wallet);
  const userSnapshot = await db.user.findUnique({
    where: { wallet },
    select: {
      virtualBalance: true,
      predictions: true,
      tradesCount: true,
      onboardingCompleted: true,
    },
  });

  return {
    wallet,
    newVirtualBalance,
    countsBefore,
    countsAfter,
    userSnapshot,
  };
}
