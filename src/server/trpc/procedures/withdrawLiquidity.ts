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

    const w = walletAddress.trim().toLowerCase();
    if (!w) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Wallet address is required",
      });
    }

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

    if (position.userWallet.trim().toLowerCase() !== w) {
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

    const { newBalance } = await db.$transaction(async (tx) => {
      const userRow = await tx.user.findUnique({ where: { wallet: w } });
      if (!userRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const balanceBefore = userRow.virtualBalance;
      const balanceAfter = balanceBefore + totalWithdrawal;

      if (isFullWithdrawal) {
        await tx.liquidityPosition.update({
          where: { id: positionId },
          data: {
            userWallet: w,
            status: 'withdrawn',
            withdrawnAt: timestamp,
            currentValue: 0,
            feesPending: 0,
          },
        });
      } else {
        const newValue = position.currentValue - amount;
        const newDeposit = position.depositedAmount * (newValue / position.currentValue);
        
        await tx.liquidityPosition.update({
          where: { id: positionId },
          data: {
            userWallet: w,
            depositedAmount: newDeposit,
            currentValue: newValue,
            feesPending: claimFees ? 0 : position.feesPending,
          },
        });
      }

      await tx.user.update({
        where: { wallet: w },
        data: {
          virtualBalance: balanceAfter,
          lastActive: new Date(),
        },
      });

      await tx.transaction.create({
        data: {
          wallet: w,
          type: 'withdrawal',
          amount: totalWithdrawal,
          balanceBefore,
          balanceAfter,
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

      return { newBalance: balanceAfter };
    });

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

    return {
      success: true,
      txHash,
      amount: totalWithdrawal,
      principalWithdrawn: amount,
      feesClaimed: feesToClaim,
      newBalance,
      timestamp: timestamp.toISOString(),
      message: "Withdrawal successful",
    };
  });
