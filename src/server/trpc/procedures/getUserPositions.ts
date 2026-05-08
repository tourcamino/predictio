import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { calculateHoldingReward, getHoldingRewardRate, getTimeUntilRewardsStart } from "~/systems/holdingRewards";

export const getUserPositions = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      status: z.enum(['all', 'open', 'closed', 'resolved']).default('all'),
    })
  )
  .query(async ({ input }) => {
    const { walletAddress, status } = input;
    const wallet = walletAddress.toLowerCase();

    // Build where clause (orders/users always keyed lowercase — mismatch broke Portfolio with checksum addresses)
    const where: any = {
      wallet,
    };

    if (status !== 'all') {
      where.status = status;
    }

    // Fetch orders with market data
    const orders = await db.order.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate holding rewards for each open position
    const positionsWithRewards = orders.map(order => {
      let holdingData = null;

      if (order.status === 'open' && order.heldSince) {
        const hoursHeld = (Date.now() - order.heldSince.getTime()) / (1000 * 60 * 60);
        const positionValue = (order.shares || 0) * (order.avgPrice || 0);
        const rewardAccrued = calculateHoldingReward(positionValue, hoursHeld);
        const rewardRate = getHoldingRewardRate(hoursHeld);
        const timeUntilStart = getTimeUntilRewardsStart(hoursHeld);

        holdingData = {
          hoursHeld,
          daysHeld: hoursHeld / 24,
          rewardAccrued,
          rewardRate: rewardRate?.rate || null,
          rewardRateLabel: rewardRate?.label || null,
          rewardRateEmoji: rewardRate?.emoji || null,
          timeUntilRewardsStart: timeUntilStart,
        };
      }

      return {
        ...order,
        holdingRewards: holdingData,
      };
    });

    return {
      positions: positionsWithRewards,
    };
  });
