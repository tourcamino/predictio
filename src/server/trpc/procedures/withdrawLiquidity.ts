import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { createCaller } from "~/server/trpc/root";

export const withdrawLiquidity = baseProcedure
  .input(
    z.object({
      positionId: z.string(),
      amount: z.number().positive(),
      claimFees: z.boolean().default(false),
      walletAddress: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { positionId, amount, claimFees, walletAddress } = input;

    // Get position
    const position = await db.liquidityPosition.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "LP position not found",
      });
    }

    if (position.userWallet !== walletAddress) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not authorized",
      });
    }

    if (position.status !== 'active') {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Position is not active",
      });
    }

    if (amount > position.currentValue) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Withdrawal amount exceeds position value",
      });
    }

    // Special handling for Protocol Vault
    const isProtocolVault = position.marketId === 'protocol-vault';

    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate mock transaction hash
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    const timestamp = new Date();
    const isFullWithdrawal = amount >= position.currentValue;
    const feesToClaim = claimFees ? position.feesPending : 0;
    const totalWithdrawal = amount + feesToClaim;

    if (isFullWithdrawal) {
      // Close position
      await db.liquidityPosition.update({
        where: { id: positionId },
        data: {
          status: 'withdrawn',
          withdrawnAt: timestamp,
          currentValue: 0,
          feesPending: 0,
        },
      });
    } else {
      // Partial withdrawal
      const newValue = position.currentValue - amount;
      const newDeposit = position.depositedAmount * (newValue / position.currentValue);
      
      await db.liquidityPosition.update({
        where: { id: positionId },
        data: {
          depositedAmount: newDeposit,
          currentValue: newValue,
          feesPending: claimFees ? 0 : position.feesPending,
        },
      });
    }

    // Recalculate all pool shares for this market (skip for protocol-vault)
    if (!isProtocolVault) {
      try {
        const caller = createCaller({});
        await caller.updateLPPoolShares({
          marketId: position.marketId,
        });
      } catch (error) {
        console.error('[LP Pool Shares] Failed to update pool shares:', error);
      }
    }

    // Record transaction
    await db.transaction.create({
      data: {
        wallet: walletAddress,
        type: 'withdrawal',
        amount: totalWithdrawal,
        marketId: position.marketId,
        txHash,
        status: 'completed',
        metadata: {
          type: isProtocolVault ? 'protocol_vault_withdrawal' : 'lp_withdrawal',
          principalWithdrawn: amount,
          feesClaimed: feesToClaim,
          isFullWithdrawal,
          ...(isProtocolVault && { vaultWithdrawal: true }),
        },
      },
    });

    return {
      success: true,
      txHash,
      amount: totalWithdrawal,
      principalWithdrawn: amount,
      feesClaimed: feesToClaim,
      timestamp: timestamp.toISOString(),
      message: "Withdrawal successful",
    };
  });
