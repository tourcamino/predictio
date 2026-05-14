import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { createCaller } from "~/server/trpc/root";
import {
  creditWalletPoints,
  POINT_ACTION_VALUES,
} from "~/server/utils/pointsLedger";
import { liquidityPointsForUsdcDeposit } from "~/server/utils/pointsPure";

export const provideLiquidity = baseProcedure
  .input(
    z.object({
      marketId: z.string(),
      amount: z.number().positive().max(1000000),
      walletAddress: z.string(),
      currentBalance: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { marketId, amount, walletAddress } = input;

    const w = walletAddress.trim().toLowerCase();
    if (!w) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Wallet address is required",
      });
    }

    await db.user.upsert({
      where: { wallet: w },
      create: {
        wallet: w,
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

    // Validate amount
    if (amount < 10) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Minimum liquidity deposit is $10 USDC",
      });
    }

    // Special handling for Protocol Vault
    const isProtocolVault = marketId === 'protocol-vault';

    if (!isProtocolVault) {
      // Check if market exists (only for individual markets)
      const market = await db.market.findUnique({
        where: { id: marketId },
      });

      if (!market) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Market not found",
        });
      }

      if (market.status !== 'open') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot provide liquidity to closed market",
        });
      }
    }

    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate mock transaction hash
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    const timestamp = new Date();
    
    let currentPoolSize: number;
    let newPoolSize: number;
    let poolShare: number;

    if (isProtocolVault) {
      // For Protocol Vault, calculate based on all active LP positions
      const allPositions = await db.liquidityPosition.findMany({
        where: {
          marketId: 'protocol-vault',
          status: 'active',
        },
      });
      
      currentPoolSize = allPositions.reduce((sum, pos) => sum + pos.depositedAmount, 0);
      newPoolSize = currentPoolSize + amount;
      poolShare = amount / newPoolSize;
    } else {
      // For individual markets, use market's LP pool
      const market = await db.market.findUnique({
        where: { id: marketId },
      });
      
      currentPoolSize = market?.totalLPPool || 0;
      newPoolSize = currentPoolSize + amount;
      poolShare = amount / newPoolSize;
    }

    const walletVariants = [w, walletAddress.trim()].filter(
      (v, i, a) => v && a.indexOf(v) === i,
    );

    const { balanceAfter } = await db.$transaction(async (tx) => {
      const userRow = await tx.user.findUnique({ where: { wallet: w } });
      if (!userRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }
      if (userRow.virtualBalance < amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient balance. Available: $${userRow.virtualBalance.toFixed(2)}`,
        });
      }

      const balanceBefore = userRow.virtualBalance;
      const nextBalance = balanceBefore - amount;

      const existingPosition = await tx.liquidityPosition.findFirst({
        where: {
          marketId,
          status: 'active',
          userWallet: { in: walletVariants },
        },
      });

      if (existingPosition) {
        const newDeposit = existingPosition.depositedAmount + amount;
        const newValue = existingPosition.currentValue + amount;
        const newShare = newDeposit / newPoolSize;

        await tx.liquidityPosition.update({
          where: { id: existingPosition.id },
          data: {
            userWallet: w,
            depositedAmount: newDeposit,
            currentValue: newValue,
            poolShare: newShare,
          },
        });
      } else {
        await tx.liquidityPosition.create({
          data: {
            marketId,
            userWallet: w,
            depositedAmount: amount,
            currentValue: amount,
            poolShare,
            status: 'active',
          },
        });
      }

      await tx.user.update({
        where: { wallet: w },
        data: {
          virtualBalance: nextBalance,
          lastActive: new Date(),
        },
      });

      await tx.transaction.create({
        data: {
          wallet: w,
          type: 'deposit',
          amount,
          balanceBefore,
          balanceAfter: nextBalance,
          marketId: isProtocolVault ? null : marketId,
          txHash,
          status: 'completed',
          metadata: {
            type: isProtocolVault ? 'protocol_vault_deposit' : 'lp_deposit',
            poolShare,
            ...(isProtocolVault && { vaultDeposit: true }),
          },
        },
      });

      return { balanceAfter: nextBalance };
    });

    // Recalculate all pool shares for this market (skip for protocol-vault)
    if (!isProtocolVault) {
      try {
        const caller = createCaller({});
        await caller.updateLPPoolShares({
          marketId,
        });
      } catch (error) {
        console.error('[LP Pool Shares] Failed to update pool shares:', error);
      }
    }

    // Points: 10 pts per $10 USDC deposited (guide: LIQUIDITY_ADDED)
    const liquidityPoints = liquidityPointsForUsdcDeposit(
      amount,
      POINT_ACTION_VALUES.LIQUIDITY_ADDED,
    );
    if (liquidityPoints > 0) {
      const unitsOfTen = Math.floor(amount / 10);
      try {
        await creditWalletPoints(w, "LIQUIDITY_ADDED", liquidityPoints, {
          marketId,
          amount,
          unitsOfTen,
        });
        console.log(
          `[Points] Credited ${liquidityPoints} pts to ${w} for LIQUIDITY_ADDED (${unitsOfTen}×$10)`,
        );
      } catch (err) {
        console.error("[Points] Failed to credit LIQUIDITY_ADDED:", err);
      }
    }

    return {
      success: true,
      txHash,
      amount,
      poolShare,
      newBalance: balanceAfter,
      timestamp: timestamp.toISOString(),
      message: isProtocolVault 
        ? "Liquidity added to Protocol Vault successfully"
        : "Liquidity added successfully",
    };
  });
