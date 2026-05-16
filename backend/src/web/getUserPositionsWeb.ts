import type { PrismaClient } from "@prisma/client";
import {
  calculateHoldingReward,
  getHoldingRewardRate,
  getTimeUntilRewardsStart,
} from "../lib/holdingRewards";

export type UserPositionsStatus = "all" | "open" | "closed" | "resolved";

export async function runGetUserPositionsWeb(
  prisma: PrismaClient,
  walletAddress: string,
  status: UserPositionsStatus = "all",
) {
  const wallet = walletAddress.trim().toLowerCase();
  const where: { wallet: string; status?: string } = { wallet };
  if (status !== "all") where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: {
      market: {
        select: {
          id: true,
          event: true,
          sport: true,
          league: true,
          outcomes: true,
          status: true,
          closesAt: true,
          resolvedAt: true,
          winner: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const positions = orders.map((order) => {
    let holdingRewards: Record<string, unknown> | null = null;
    if (order.status === "open" && order.heldSince) {
      const hoursHeld = (Date.now() - order.heldSince.getTime()) / (1000 * 60 * 60);
      const positionValue = (order.shares || 0) * (order.avgPrice || 0);
      const rewardAccrued = calculateHoldingReward(positionValue, hoursHeld);
      const rewardRate = getHoldingRewardRate(hoursHeld);
      holdingRewards = {
        hoursHeld,
        daysHeld: hoursHeld / 24,
        rewardAccrued,
        rewardRate: rewardRate?.rate ?? null,
        rewardRateLabel: rewardRate?.label ?? null,
        rewardRateEmoji: rewardRate?.emoji ?? null,
        timeUntilRewardsStart: getTimeUntilRewardsStart(hoursHeld),
      };
    }
    return { ...order, holdingRewards };
  });

  return { positions, runtime: "express-vps" as const };
}

export async function countOrdersForWalletWeb(
  prisma: PrismaClient,
  walletAddress: string,
) {
  const wallet = walletAddress.trim().toLowerCase();
  return prisma.order.count({ where: { wallet } });
}
