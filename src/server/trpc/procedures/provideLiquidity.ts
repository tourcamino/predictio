import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { createCaller } from "~/server/trpc/root";

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
    const { marketId, amount, walletAddress, currentBalance } = input;

    // Validate amount
    if (amount < 10) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Minimum liquidity deposit is $10 USDC",
      });
    }

    if (amount > currentBalance) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Insufficient balance",
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

    // Create or update LP position
    const existingPosition = await db.liquidityPosition.findFirst({
      where: {
        marketId,
        userWallet: walletAddress,
        status: 'active',
      },
    });

    if (existingPosition) {
      // Update existing position
      const newDeposit = existingPosition.depositedAmount + amount;
      const newValue = existingPosition.currentValue + amount;
      const newShare = newDeposit / newPoolSize;

      await db.liquidityPosition.update({
        where: { id: existingPosition.id },
        data: {
          depositedAmount: newDeposit,
          currentValue: newValue,
          poolShare: newShare,
        },
      });
    } else {
      // Create new position
      await db.liquidityPosition.create({
        data: {
          marketId,
          userWallet: walletAddress,
          depositedAmount: amount,
          currentValue: amount,
          poolShare,
          status: 'active',
        },
      });
    }

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

    // Record transaction
    await db.transaction.create({
      data: {
        wallet: walletAddress,
        type: 'deposit',
        amount,
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

    return {
      success: true,
      txHash,
      amount,
      poolShare,
      timestamp: timestamp.toISOString(),
      message: isProtocolVault 
        ? "Liquidity added to Protocol Vault successfully"
        : "Liquidity added successfully",
    };
  });
