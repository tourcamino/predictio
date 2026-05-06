import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const closePosition = baseProcedure
  .input(
    z.object({
      orderId: z.string(),
      walletAddress: z.string(),
      sharesToSell: z.number().positive(),
      currentPrice: z.number().positive(),
    })
  )
  .mutation(async ({ input }) => {
    const { orderId, walletAddress, sharesToSell, currentPrice } = input;
    
    // Get the order
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { market: true },
    });
    
    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Position not found",
      });
    }
    
    // Verify ownership
    if (order.wallet.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't own this position",
      });
    }
    
    // Verify position is open
    if (order.status !== 'open') {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Position is not open",
      });
    }
    
    // Verify sufficient shares
    const availableShares = order.shares || 0;
    if (sharesToSell > availableShares) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Insufficient shares",
      });
    }
    
    // Calculate proceeds (no fee on sells in paper trading)
    const proceeds = sharesToSell * currentPrice;
    
    // Calculate P&L for this sale
    const costBasis = sharesToSell * (order.avgPrice || 0);
    const realizedPnL = proceeds - costBasis;
    
    // Get user
    const user = await db.user.findUnique({
      where: { wallet: walletAddress.toLowerCase() },
    });
    
    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    
    const balanceBefore = user.virtualBalance;
    const balanceAfter = balanceBefore + proceeds;
    
    // Update user balance and P&L
    await db.user.update({
      where: { wallet: walletAddress.toLowerCase() },
      data: {
        virtualBalance: balanceAfter,
        totalPnl: user.totalPnl + realizedPnL,
        lastActive: new Date(),
      },
    });
    
    // Record transaction
    await db.transaction.create({
      data: {
        wallet: walletAddress.toLowerCase(),
        type: 'bet_won', // or 'bet_lost' based on P&L
        amount: proceeds,
        balanceBefore,
        balanceAfter,
        marketId: order.marketId,
        orderId: order.id,
        status: 'completed',
        feePaid: 0,
        metadata: {
          outcome: order.outcome,
          sharesSold: sharesToSell,
          pricePerShare: currentPrice,
          costBasis,
          realizedPnL,
          marketEvent: order.market.event,
        },
      },
    });
    
    // Update or close the order
    if (sharesToSell >= availableShares) {
      // Close position completely
      await db.order.update({
        where: { id: orderId },
        data: {
          status: 'closed',
          pnl: (order.pnl || 0) + realizedPnL,
          resolvedAt: new Date(),
        },
      });
    } else {
      // Reduce position
      await db.order.update({
        where: { id: orderId },
        data: {
          shares: availableShares - sharesToSell,
          pnl: (order.pnl || 0) + realizedPnL,
        },
      });
    }
    
    return {
      success: true,
      proceeds,
      realizedPnL,
      newBalance: balanceAfter,
      message: `Sold ${sharesToSell.toFixed(2)} shares for $${proceeds.toFixed(2)}`,
    };
  });
