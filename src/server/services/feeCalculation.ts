import { db } from "~/server/db";
import { env } from "~/server/env";

// Fee constants (hardcoded as per new logic)
export const FEE_VAULT = 0.50;
export const FEE_ANALYST = 0.35;
export const FEE_REFERRAL = 0.15;
export const TAKER_FEE_RATE = 0.01;
export const PAYOUT_THRESHOLD_EUR = 10;

interface FeeDistribution {
  vaultAmount: number;
  analystAmount: number;
  referralAmount: number;
  treasuryAmount: number;
  analystWallet: string | null;
  referralWallet: string | null;
}

interface TradeData {
  tradeId: string;
  traderWallet: string;
  volume: number;
  analystWallet?: string | null; // Who is being copied
  referralWallet?: string | null; // Who referred the trader
}

/**
 * Calculate fee split for a trade
 * Implements 50/35/15 split with all special cases
 */
export async function calculateFeeSplit(
  tradeData: TradeData
): Promise<FeeDistribution> {
  const totalFee = tradeData.volume * TAKER_FEE_RATE;
  const founderWallet = env.FOUNDER_WALLET?.toLowerCase();
  const treasuryWallet = env.TREASURY_WALLET?.toLowerCase();

  const vaultAmount = totalFee * FEE_VAULT; // Always 50%
  let analystAmount = 0;
  let referralAmount = 0;
  let treasuryAmount = 0;

  const analystWallet = tradeData.analystWallet?.toLowerCase() || null;
  const referralWallet = tradeData.referralWallet?.toLowerCase() || null;
  const traderWallet = tradeData.traderWallet.toLowerCase();

  // CASE A: analyst = referral (same person)
  if (
    analystWallet &&
    referralWallet &&
    analystWallet === referralWallet &&
    analystWallet !== founderWallet
  ) {
    // That wallet receives 50% (35% + 15%)
    analystAmount = totalFee * (FEE_ANALYST + FEE_REFERRAL);
    referralAmount = 0;
    console.log(
      `[Fee Split] Case A: Analyst = Referral (${analystWallet}) receives 50%`
    );
  }
  // CASE B: no referral tracked
  else if (!referralWallet || referralWallet === founderWallet) {
    // 15% goes to treasury
    treasuryAmount += totalFee * FEE_REFERRAL;

    // Analyst gets 35% if valid
    if (analystWallet && analystWallet !== founderWallet) {
      analystAmount = totalFee * FEE_ANALYST;
    } else {
      treasuryAmount += totalFee * FEE_ANALYST;
    }

    console.log(
      `[Fee Split] Case B: No referral → 15% to treasury (total treasury: ${treasuryAmount.toFixed(2)})`
    );
  }
  // CASE C: trade not copied (no analyst)
  else if (!analystWallet || analystWallet === founderWallet) {
    // 35% goes to treasury
    treasuryAmount += totalFee * FEE_ANALYST;

    // Referral gets 15% if valid and not the trader themselves
    if (referralWallet && referralWallet !== traderWallet) {
      referralAmount = totalFee * FEE_REFERRAL;
    } else {
      treasuryAmount += totalFee * FEE_REFERRAL;
    }

    console.log(
      `[Fee Split] Case C: No analyst → 35% to treasury (total treasury: ${treasuryAmount.toFixed(2)})`
    );
  }
  // Normal case: both analyst and referral exist and are valid
  else {
    if (analystWallet && analystWallet !== founderWallet) {
      analystAmount = totalFee * FEE_ANALYST;
    } else {
      treasuryAmount += totalFee * FEE_ANALYST;
    }

    if (
      referralWallet &&
      referralWallet !== founderWallet &&
      referralWallet !== traderWallet
    ) {
      referralAmount = totalFee * FEE_REFERRAL;
    } else {
      treasuryAmount += totalFee * FEE_REFERRAL;
    }
  }

  // Verify total adds up to 100%
  const total = vaultAmount + analystAmount + referralAmount + treasuryAmount;
  const expectedTotal = totalFee;
  if (Math.abs(total - expectedTotal) > 0.01) {
    console.error(
      `[Fee Split] ERROR: Total fee mismatch! Expected ${expectedTotal.toFixed(2)}, got ${total.toFixed(2)}`
    );
  }

  console.log(
    `[Fee Split] Trade ${tradeData.tradeId}: Vault=${vaultAmount.toFixed(2)}, Analyst=${analystAmount.toFixed(2)}, Referral=${referralAmount.toFixed(2)}, Treasury=${treasuryAmount.toFixed(2)}`
  );

  return {
    vaultAmount,
    analystAmount,
    referralAmount,
    treasuryAmount,
    analystWallet:
      analystAmount > 0 && analystWallet !== founderWallet
        ? analystWallet
        : null,
    referralWallet:
      referralAmount > 0 && referralWallet !== founderWallet
        ? referralWallet
        : null,
  };
}

/**
 * Record fee distribution in database
 */
export async function recordFeeDistribution(
  tradeData: TradeData,
  distribution: FeeDistribution
) {
  const usdc_eur_rate = parseFloat(env.USDC_EUR_RATE || "0.92");

  // Record analyst reward if applicable
  if (distribution.analystWallet && distribution.analystAmount > 0) {
    await db.affiliateReward.create({
      data: {
        walletAddress: distribution.analystWallet,
        refCode: null, // Could be populated if needed
        tradeId: tradeData.tradeId,
        rewardType: distribution.referralWallet ? "analyst" : "both",
        volumeUsd: tradeData.volume,
        feeTotalUsd: tradeData.volume * TAKER_FEE_RATE,
        rewardUsd: distribution.analystAmount,
        rewardEur: distribution.analystAmount * usdc_eur_rate,
        status: "pending",
      },
    });

    // Update affiliate totals
    await db.affiliate.upsert({
      where: { walletAddress: distribution.analystWallet },
      create: {
        walletAddress: distribution.analystWallet,
        refCode: `ANALYST-${Date.now().toString(36).toUpperCase()}`,
        totalRewardsUsd: distribution.analystAmount,
        pendingRewardsUsd: distribution.analystAmount,
        pendingRewardsEur: distribution.analystAmount * usdc_eur_rate,
      },
      update: {
        totalRewardsUsd: { increment: distribution.analystAmount },
        pendingRewardsUsd: { increment: distribution.analystAmount },
        pendingRewardsEur: {
          increment: distribution.analystAmount * usdc_eur_rate,
        },
      },
    });
  }

  // Record referral reward if applicable
  if (distribution.referralWallet && distribution.referralAmount > 0) {
    await db.affiliateReward.create({
      data: {
        walletAddress: distribution.referralWallet,
        refCode: null,
        tradeId: tradeData.tradeId,
        rewardType: distribution.analystWallet ? "referral" : "both",
        volumeUsd: tradeData.volume,
        feeTotalUsd: tradeData.volume * TAKER_FEE_RATE,
        rewardUsd: distribution.referralAmount,
        rewardEur: distribution.referralAmount * usdc_eur_rate,
        status: "pending",
      },
    });

    // Update affiliate totals
    await db.affiliate.upsert({
      where: { walletAddress: distribution.referralWallet },
      create: {
        walletAddress: distribution.referralWallet,
        refCode: `REF-${Date.now().toString(36).toUpperCase()}`,
        totalRewardsUsd: distribution.referralAmount,
        pendingRewardsUsd: distribution.referralAmount,
        pendingRewardsEur: distribution.referralAmount * usdc_eur_rate,
      },
      update: {
        totalRewardsUsd: { increment: distribution.referralAmount },
        pendingRewardsUsd: { increment: distribution.referralAmount },
        pendingRewardsEur: {
          increment: distribution.referralAmount * usdc_eur_rate,
        },
      },
    });
  }

  // Record treasury allocation if applicable
  if (distribution.treasuryAmount > 0) {
    let reason = "no_both";
    if (!distribution.analystWallet && !distribution.referralWallet) {
      reason = "no_both";
    } else if (!distribution.analystWallet) {
      reason = "no_analyst";
    } else if (!distribution.referralWallet) {
      reason = "no_referral";
    } else {
      reason = "founder_excluded";
    }

    await db.treasuryLog.create({
      data: {
        reason,
        tradeId: tradeData.tradeId,
        amountUsd: distribution.treasuryAmount,
        walletFrom: tradeData.traderWallet,
      },
    });
  }

  // Update vault state
  await db.vaultState.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      totalTvl: 500 + distribution.vaultAmount,
      availableLiquidity: 500 + distribution.vaultAmount,
      exposedLiquidity: 0,
      feeCollected: distribution.vaultAmount,
      lastRebalance: new Date(),
    },
    update: {
      totalTvl: { increment: distribution.vaultAmount },
      availableLiquidity: { increment: distribution.vaultAmount },
      feeCollected: { increment: distribution.vaultAmount },
    },
  });

  // Check payout thresholds
  await checkPayoutThresholds(distribution);
}

/**
 * Check if any affiliate has reached payout threshold
 */
async function checkPayoutThresholds(distribution: FeeDistribution) {
  const walletsToCheck = [
    distribution.analystWallet,
    distribution.referralWallet,
  ].filter((w): w is string => w !== null);

  for (const wallet of walletsToCheck) {
    const affiliate = await db.affiliate.findUnique({
      where: { walletAddress: wallet },
    });

    if (
      affiliate &&
      affiliate.pendingRewardsEur >= PAYOUT_THRESHOLD_EUR
    ) {
      // Update status to pending_payment
      await db.affiliateReward.updateMany({
        where: {
          walletAddress: wallet,
          status: "pending",
        },
        data: {
          status: "pending_payment",
        },
      });

      // Create notification for admin
      await db.notification.create({
        data: {
          walletAddress: env.FOUNDER_WALLET || "admin",
          type: "AFFILIATE_PAYOUT_READY",
          title: "Affiliate Payout Ready",
          message: `${wallet} has reached €${affiliate.pendingRewardsEur.toFixed(2)} and is ready for payout`,
        },
      }).catch((err) => {
        console.error("[Fee Split] Failed to create admin notification:", err);
      });

      console.log(
        `[Fee Split] ${wallet} reached payout threshold: €${affiliate.pendingRewardsEur.toFixed(2)}`
      );
    }
  }
}
