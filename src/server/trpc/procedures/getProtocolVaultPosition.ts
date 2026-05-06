import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getProtocolVaultPosition = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
    })
  )
  .query(async ({ input }) => {
    const { walletAddress } = input;

    // Get user's Protocol Vault position
    const position = await db.liquidityPosition.findFirst({
      where: {
        marketId: 'protocol-vault',
        userWallet: walletAddress.toLowerCase(),
        status: 'active',
      },
      include: {
        feeEarnings: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 90, // Last 90 fee earnings for history
        },
      },
    });

    if (!position) {
      return null;
    }

    // Get all deposits and withdrawals for this user in the Protocol Vault
    const transactions = await db.transaction.findMany({
      where: {
        wallet: walletAddress,
        type: {
          in: ['deposit', 'withdrawal'],
        },
        metadata: {
          path: ['vaultDeposit'],
          equals: true,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    // Calculate APY for the position
    const daysHeld = Math.max(1, (Date.now() - position.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const dailyReturn = position.feesEarned / position.depositedAmount / daysHeld;
    const apy = dailyReturn * 365 * 100;

    // Build comprehensive fee history from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentFees = position.feeEarnings.filter(
      earning => earning.createdAt >= thirtyDaysAgo
    );

    const feeHistory = recentFees
      .map((earning, index) => {
        const cumulative = recentFees
          .slice(0, index + 1)
          .reduce((sum, e) => sum + e.amount, 0);
        
        return {
          date: earning.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          timestamp: earning.createdAt,
          amount: earning.amount,
          cumulative,
          marketVolume: earning.marketVolume,
        };
      })
      .reverse();

    return {
      id: position.id,
      deposited: position.depositedAmount,
      currentValue: position.currentValue,
      poolShare: position.poolShare,
      feesEarned: position.feesEarned,
      feesPending: position.feesPending,
      autoCompound: position.autoCompound,
      apy,
      openSince: position.createdAt,
      status: position.status,
      feeHistory,
      transactions,
      pnl: position.currentValue - position.depositedAmount,
      pnlPct: position.depositedAmount > 0 
        ? ((position.currentValue - position.depositedAmount) / position.depositedAmount) * 100 
        : 0,
    };
  });
