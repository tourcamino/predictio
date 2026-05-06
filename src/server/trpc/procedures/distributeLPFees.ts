import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const distributeLPFees = baseProcedure
  .input(
    z.object({
      marketId: z.string(),
      totalFee: z.number().positive(),
      volume: z.number().positive(),
    })
  )
  .mutation(async ({ input }) => {
    const { marketId, totalFee, volume } = input;

    // 50% of fees go to Protocol Vault (down from 70%)
    // 35% goes to analyst being copied
    // 15% goes to referral
    const lpFeeShare = totalFee * 0.5;

    console.log(`[LP Fees] Processing ${lpFeeShare.toFixed(2)} USDC (50% of ${totalFee.toFixed(2)}) for market ${marketId}`);

    // Credit 50% of total fee to Protocol Vault
    const vaultFeeShare = totalFee * 0.5;
    
    try {
      await db.vaultState.upsert({
        where: { id: 'singleton' },
        create: {
          id: 'singleton',
          totalTvl: 500 + vaultFeeShare,
          availableLiquidity: 500 + vaultFeeShare,
          exposedLiquidity: 0,
          feeCollected: vaultFeeShare,
          lastRebalance: new Date(),
        },
        update: {
          totalTvl: { increment: vaultFeeShare },
          availableLiquidity: { increment: vaultFeeShare },
          feeCollected: { increment: vaultFeeShare },
        },
      });
      
      console.log(`[Vault] Credited ${vaultFeeShare.toFixed(2)} USDC to Protocol Vault (50% of ${totalFee.toFixed(2)} total fee)`);
    } catch (vaultError) {
      console.error('[Vault] Failed to credit fees to vault:', vaultError);
      // Don't fail the distribution if vault update fails
    }

    return {
      distributed: true,
      lpFeeShare,
      totalDistributed: vaultFeeShare,
      recipientCount: 1,
      vaultCredited: vaultFeeShare,
    };
  });
