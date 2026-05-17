import type { Prisma, PrismaClient } from "@prisma/client";

export type FeeSplitDb = PrismaClient | Prisma.TransactionClient;

export const TAKER_FEE_RATE = Number(process.env.TAKER_FEE_RATE || 0.01);
export const FEE_VAULT = Number(process.env.FEE_VAULT || 0.5);
export const FEE_ANALYST = Number(process.env.FEE_ANALYST || 0.35);
export const FEE_REFERRAL = Number(process.env.FEE_REFERRAL || 0.15);
export const PAYOUT_THRESHOLD_EUR = Number(process.env.PAYOUT_THRESHOLD_EUR || 10);
export const USDC_EUR_RATE = Number(process.env.USDC_EUR_RATE || 0.92);

/** Matches Prisma VaultState.totalTvl default seed when creating the singleton row. */
export const VAULT_INITIAL_TVL_SEED = Number(
  process.env.VAULT_INITIAL_TVL_SEED ?? process.env.VAULT_SEED_AMOUNT ?? 500,
);

export type FeeSplitInput = {
  tradeId: string;
  traderWallet: string;
  volumeUsd: number;
  analystWallet?: string | null;
  referralWallet?: string | null;
};

export type FeeSplitResult = {
  feeTotalUsd: number;
  vaultUsd: number;
  analystUsd: number;
  referralUsd: number;
  treasuryUsd: number;
  analystWallet: string | null;
  referralWallet: string | null;
};

export function calculateFeeSplit(input: FeeSplitInput): FeeSplitResult {
  const totalFee = input.volumeUsd * TAKER_FEE_RATE;

  const founderWallet = (process.env.FOUNDER_WALLET || "").toLowerCase() || null;
  const treasuryWallet = (process.env.TREASURY_WALLET || "").toLowerCase() || null;
  void treasuryWallet; // reserved for future on-chain payout wiring

  const traderWallet = input.traderWallet.toLowerCase();
  const analystWallet = input.analystWallet?.toLowerCase() || null;
  const referralWallet = input.referralWallet?.toLowerCase() || null;

  const vaultUsd = totalFee * FEE_VAULT;
  let analystUsd = 0;
  let referralUsd = 0;
  let treasuryUsd = 0;

  // CASE A: analyst = referral
  if (
    analystWallet &&
    referralWallet &&
    analystWallet === referralWallet &&
    analystWallet !== founderWallet
  ) {
    analystUsd = totalFee * (FEE_ANALYST + FEE_REFERRAL);
  }
  // CASE B: no referral (or founder)
  else if (!referralWallet || referralWallet === founderWallet) {
    treasuryUsd += totalFee * FEE_REFERRAL;

    if (analystWallet && analystWallet !== founderWallet) {
      analystUsd = totalFee * FEE_ANALYST;
    } else {
      treasuryUsd += totalFee * FEE_ANALYST;
    }
  }
  // CASE C: no analyst (or founder)
  else if (!analystWallet || analystWallet === founderWallet) {
    treasuryUsd += totalFee * FEE_ANALYST;

    if (referralWallet && referralWallet !== traderWallet) {
      referralUsd = totalFee * FEE_REFERRAL;
    } else {
      treasuryUsd += totalFee * FEE_REFERRAL;
    }
  }
  // Normal case
  else {
    if (analystWallet && analystWallet !== founderWallet) {
      analystUsd = totalFee * FEE_ANALYST;
    } else {
      treasuryUsd += totalFee * FEE_ANALYST;
    }

    if (
      referralWallet &&
      referralWallet !== founderWallet &&
      referralWallet !== traderWallet
    ) {
      referralUsd = totalFee * FEE_REFERRAL;
    } else {
      treasuryUsd += totalFee * FEE_REFERRAL;
    }
  }

  const sum = vaultUsd + analystUsd + referralUsd + treasuryUsd;
  if (Math.abs(sum - totalFee) > 0.01) {
     
    console.error(
      `[fees] mismatch: expected=${totalFee.toFixed(4)} got=${sum.toFixed(4)} trade=${input.tradeId}`
    );
  }

  return {
    feeTotalUsd: totalFee,
    vaultUsd,
    analystUsd,
    referralUsd,
    treasuryUsd,
    analystWallet:
      analystUsd > 0 && analystWallet !== founderWallet ? analystWallet : null,
    referralWallet:
      referralUsd > 0 && referralWallet !== founderWallet ? referralWallet : null,
  };
}

export async function persistFeeSplit(params: {
  prisma: FeeSplitDb;
  input: FeeSplitInput;
  split: FeeSplitResult;
}) {
  const { prisma, input, split } = params;

  const usdcToEur = USDC_EUR_RATE;

  const aw = input.analystWallet?.toLowerCase() || null;
  const rw = input.referralWallet?.toLowerCase() || null;
  const analystRewardType: "analyst" | "both" =
    split.analystUsd > 0 && split.referralUsd > 0
      ? "analyst"
      : aw && rw && aw === rw
        ? "both"
        : "analyst";

  if (split.analystWallet && split.analystUsd > 0) {
    await prisma.affiliateReward.create({
      data: {
        walletAddress: split.analystWallet,
        refCode: null,
        tradeId: input.tradeId,
        rewardType: analystRewardType,
        volumeUsd: input.volumeUsd,
        feeTotalUsd: split.feeTotalUsd,
        rewardUsd: split.analystUsd,
        rewardEur: split.analystUsd * usdcToEur,
        status: "pending",
      },
    });

    await prisma.affiliate.upsert({
      where: { walletAddress: split.analystWallet },
      create: {
        walletAddress: split.analystWallet,
        refCode: `ANALYST-${Date.now().toString(36).toUpperCase()}`,
        totalRewardsUsd: split.analystUsd,
        pendingRewardsUsd: split.analystUsd,
        pendingRewardsEur: split.analystUsd * usdcToEur,
      },
      update: {
        totalRewardsUsd: { increment: split.analystUsd },
        pendingRewardsUsd: { increment: split.analystUsd },
        pendingRewardsEur: { increment: split.analystUsd * usdcToEur },
      },
    });
  }

  if (split.referralWallet && split.referralUsd > 0) {
    await prisma.affiliateReward.create({
      data: {
        walletAddress: split.referralWallet,
        refCode: null,
        tradeId: input.tradeId,
        rewardType: "referral",
        volumeUsd: input.volumeUsd,
        feeTotalUsd: split.feeTotalUsd,
        rewardUsd: split.referralUsd,
        rewardEur: split.referralUsd * usdcToEur,
        status: "pending",
      },
    });

    await prisma.affiliate.upsert({
      where: { walletAddress: split.referralWallet },
      create: {
        walletAddress: split.referralWallet,
        refCode: `REF-${Date.now().toString(36).toUpperCase()}`,
        totalRewardsUsd: split.referralUsd,
        pendingRewardsUsd: split.referralUsd,
        pendingRewardsEur: split.referralUsd * usdcToEur,
      },
      update: {
        totalRewardsUsd: { increment: split.referralUsd },
        pendingRewardsUsd: { increment: split.referralUsd },
        pendingRewardsEur: { increment: split.referralUsd * usdcToEur },
      },
    });
  }

  if (split.treasuryUsd > 0) {
    const reason =
      !split.analystWallet && !split.referralWallet
        ? "no_both"
        : !split.analystWallet
          ? "no_analyst"
          : !split.referralWallet
            ? "no_referral"
            : "founder_excluded";

    await prisma.treasuryLog.create({
      data: {
        reason,
        tradeId: input.tradeId,
        amountUsd: split.treasuryUsd,
        walletFrom: input.traderWallet.toLowerCase(),
      },
    });
  }

  await prisma.vaultState.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      totalTvl: VAULT_INITIAL_TVL_SEED + split.vaultUsd,
      availableLiquidity: VAULT_INITIAL_TVL_SEED + split.vaultUsd,
      exposedLiquidity: 0,
      feeCollected: split.vaultUsd,
      lastRebalance: new Date(),
    },
    update: {
      totalTvl: { increment: split.vaultUsd },
      availableLiquidity: { increment: split.vaultUsd },
      feeCollected: { increment: split.vaultUsd },
    },
  });

  /** Protocol vault LP positions — trade fees accrue to claimable `feesPending`, not user cash balance. */
  await creditProtocolVaultLpFeeShare(prisma, split.vaultUsd);

  await markPayoutReadyIfThreshold(prisma, split.analystWallet);
  await markPayoutReadyIfThreshold(prisma, split.referralWallet);
}

async function creditProtocolVaultLpFeeShare(
  prisma: FeeSplitDb,
  vaultUsd: number,
): Promise<void> {
  if (vaultUsd <= 0) return;
  const positions = await prisma.liquidityPosition.findMany({
    where: { marketId: "protocol-vault", status: "active" },
    select: { id: true, depositedAmount: true },
  });
  const totalDeposited = positions.reduce((s, p) => s + p.depositedAmount, 0);
  if (totalDeposited <= 0) return;

  for (const p of positions) {
    const share = (p.depositedAmount / totalDeposited) * vaultUsd;
    if (share <= 0) continue;
    await prisma.liquidityPosition.update({
      where: { id: p.id },
      data: { feesPending: { increment: share } },
    });
  }
}

async function markPayoutReadyIfThreshold(
  prisma: FeeSplitDb,
  wallet: string | null
) {
  if (!wallet) return;

  const affiliate = await prisma.affiliate.findUnique({
    where: { walletAddress: wallet },
  });
  if (!affiliate) return;

  if (affiliate.pendingRewardsEur >= PAYOUT_THRESHOLD_EUR) {
    await prisma.affiliateReward.updateMany({
      where: { walletAddress: wallet, status: "pending" },
      data: { status: "pending_payment" },
    });
  }
}

