import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getVaultState = baseProcedure
  .input(z.object({}).optional())
  .query(async ({ input }) => {
    // Get or create singleton vault state
    let vaultState = await db.vaultState.findUnique({
      where: { id: 'singleton' },
    });

    if (!vaultState) {
      // Initialize vault state with $500 seed capital
      vaultState = await db.vaultState.create({
        data: {
          id: 'singleton',
          totalTvl: 500,
          availableLiquidity: 500,
          exposedLiquidity: 0,
          feeCollected: 0,
          lastRebalance: new Date(),
        },
      });
    }

    return {
      totalTvl: vaultState.totalTvl,
      availableLiquidity: vaultState.availableLiquidity,
      exposedLiquidity: vaultState.exposedLiquidity,
      feeCollected: vaultState.feeCollected,
      lastRebalance: vaultState.lastRebalance,
      utilizationRate: vaultState.totalTvl > 0 
        ? (vaultState.exposedLiquidity / vaultState.totalTvl) * 100 
        : 0,
    };
  });
