import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";
import {
  creditWalletPoints,
  POINT_ACTION_VALUES,
} from "~/server/utils/pointsLedger";

export const resolvePaperPositions = baseProcedure
  .input(
    z.object({
      marketId: z.string(),
      winningOutcome: z.enum(['YES', 'NO']),
    })
  )
  .mutation(async ({ input }) => {
    const { marketId, winningOutcome } = input;

    // Get all open positions for this market
    const openPositions = await db.order.findMany({
      where: {
        marketId,
        status: 'open',
      },
    });
    
    if (openPositions.length === 0) {
      return {
        success: true,
        resolvedCount: 0,
        message: 'No open positions to resolve',
      };
    }

    const marketUi = await loadMarketUiById(marketId);
    const marketLabel =
      marketUi?.event ??
      (marketUi ? `${marketUi.teamA} vs ${marketUi.teamB}` : marketId);
    
    console.log(`[Paper Trading] Resolving ${openPositions.length} positions for market ${marketId}`);
    
    // Process each position
    const updates = await Promise.all(
      openPositions.map(async (position) => {
        const shares = position.shares || 0;
        const avgPrice = position.avgPrice || 0;
        const costBasis = shares * avgPrice;
        
        // Determine if this position won
        const isWinner = position.outcome.toUpperCase() === winningOutcome;
        
        // Calculate payout: winners get $1.00 per share, losers get $0.00
        const payout = isWinner ? shares * 1.00 : 0;
        const pnl = payout - costBasis;
        
        // Get user
        const user = await db.user.findUnique({
          where: { wallet: position.wallet },
        });
        
        if (!user) {
          console.error(`[Paper Trading] User not found: ${position.wallet}`);
          return null;
        }
        
        const balanceBefore = user.virtualBalance;
        const balanceAfter = balanceBefore + payout;
        
        // Update user balance and stats
        await db.user.update({
          where: { wallet: position.wallet },
          data: {
            virtualBalance: balanceAfter,
            totalPnl: user.totalPnl + pnl,
            wins: isWinner ? user.wins + 1 : user.wins,
            losses: !isWinner ? user.losses + 1 : user.losses,
            lastActive: new Date(),
          },
        });
        
        // Update position
        await db.order.update({
          where: { id: position.id },
          data: {
            status: 'resolved',
            pnl,
            resolvedAt: new Date(),
          },
        });
        
        // Record transaction
        await db.transaction.create({
          data: {
            wallet: position.wallet,
            type: isWinner ? 'bet_won' : 'bet_lost',
            amount: payout,
            balanceBefore,
            balanceAfter,
            marketId,
            orderId: position.id,
            status: 'completed',
            metadata: {
              outcome: position.outcome,
              winningOutcome,
              shares,
              payout,
              pnl,
              isWinner,
            },
          },
        });
        
        // Create MARKET_RESOLVED notification
        const pnlFormatted = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;

        await db.notification.create({
          data: {
            walletAddress: position.wallet,
            type: 'MARKET_RESOLVED',
            title: 'Market Resolved',
            message: `${marketLabel} — ${winningOutcome} won. Your position: ${pnlFormatted}`,
            marketId,
          },
        }).catch((err) => {
          console.error('[Notifications] Failed to create MARKET_RESOLVED notification:', err);
        });

        if (isWinner) {
          try {
            await creditWalletPoints(
              position.wallet,
              "MARKET_RESOLVED_WIN",
              POINT_ACTION_VALUES.MARKET_RESOLVED_WIN,
              { marketId, marketLabel, winningOutcome },
            );
          } catch (err) {
            console.error("[Points] Failed to credit MARKET_RESOLVED_WIN:", err);
          }
        }

        return {
          wallet: position.wallet,
          isWinner,
          payout,
          pnl,
        };
      })
    );
    
    const validUpdates = updates.filter(Boolean);
    const winners = validUpdates.filter(u => u?.isWinner);
    const losers = validUpdates.filter(u => !u?.isWinner);

    if (validUpdates.length > 0) {
      try {
        await db.market.update({
          where: { id: marketId },
          data: {
            status: 'resolved',
            winner: winningOutcome,
            resolvedAt: new Date(),
          },
        });
      } catch {
        /* Market id may exist only in mocks / Azuro without a DB row */
      }
    }
    
    console.log(`[Paper Trading] Resolved ${validUpdates.length} positions: ${winners.length} winners, ${losers.length} losers`);
    
    return {
      success: true,
      resolvedCount: validUpdates.length,
      winners: winners.length,
      losers: losers.length,
      message: `Resolved ${validUpdates.length} positions`,
    };
  });
