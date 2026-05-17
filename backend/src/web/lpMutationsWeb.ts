import type { PrismaClient } from "@prisma/client";
import {
  creditWalletPoints,
  POINT_ACTION_VALUES,
} from "./pointsLedgerWeb";

export type ProvideLiquidityWebInput = {
  marketId: string;
  amount: number;
  walletAddress: string;
};

export type WithdrawLiquidityWebInput = {
  positionId: string;
  amount: number;
  claimFees?: boolean;
  walletAddress: string;
};

function normalizeWallet(walletAddress: string): string {
  const w = walletAddress.trim().toLowerCase();
  if (!w) throw new Error("Wallet address is required");
  return w;
}

function txHash(): string {
  return `0x${Math.random().toString(16).slice(2, 66).padEnd(64, "0").slice(0, 64)}`;
}

export async function runProvideLiquidityWeb(
  prisma: PrismaClient,
  input: ProvideLiquidityWebInput,
) {
  const { marketId, amount } = input;
  const w = normalizeWallet(input.walletAddress);

  if (amount < 10) {
    throw new Error("Minimum liquidity deposit is $10 USDC");
  }

  const isProtocolVault = marketId === "protocol-vault";

  if (!isProtocolVault) {
    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market) throw new Error("Market not found");
    const st = String(market.status ?? "open").toLowerCase();
    if (st !== "open") {
      throw new Error("Cannot provide liquidity to this market while it is not open.");
    }
  }

  await prisma.user.upsert({
    where: { wallet: w },
    create: {
      wallet: w,
      virtualBalance: 1000,
      totalPnl: 0,
      tradesCount: 0,
      firstSeen: new Date(),
      lastActive: new Date(),
      totalVolume: 0,
      predictions: 0,
      wins: 0,
      losses: 0,
    },
    update: { lastActive: new Date() },
  });

  let currentPoolSize: number;
  let newPoolSize: number;
  let poolShare: number;

  if (isProtocolVault) {
    const allPositions = await prisma.liquidityPosition.findMany({
      where: { marketId: "protocol-vault", status: "active" },
    });
    currentPoolSize = allPositions.reduce((sum, pos) => sum + pos.depositedAmount, 0);
    newPoolSize = currentPoolSize + amount;
    poolShare = amount / newPoolSize;
  } else {
    const market = await prisma.market.findUnique({ where: { id: marketId } });
    currentPoolSize = market?.totalLPPool ?? 0;
    newPoolSize = currentPoolSize + amount;
    poolShare = amount / newPoolSize;
  }

  const hash = txHash();
  const timestamp = new Date();

  const { balanceAfter } = await prisma.$transaction(async (tx) => {
    const userRow = await tx.user.findUnique({ where: { wallet: w } });
    if (!userRow) throw new Error("User not found");
    if (userRow.virtualBalance < amount) {
      throw new Error(
        `Insufficient balance. Available: $${userRow.virtualBalance.toFixed(2)}`,
      );
    }

    const balanceBefore = userRow.virtualBalance;
    const nextBalance = balanceBefore - amount;

    const existingPosition = await tx.liquidityPosition.findFirst({
      where: {
        marketId,
        status: "active",
        userWallet: w,
      },
    });

    if (existingPosition) {
      const newDeposit = existingPosition.depositedAmount + amount;
      const newValue = existingPosition.currentValue + amount;
      await tx.liquidityPosition.update({
        where: { id: existingPosition.id },
        data: {
          depositedAmount: newDeposit,
          currentValue: newValue,
          poolShare: newDeposit / newPoolSize,
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
          status: "active",
        },
      });
    }

    if (!isProtocolVault) {
      await tx.market.update({
        where: { id: marketId },
        data: { totalLPPool: newPoolSize },
      });
    }

    await tx.user.update({
      where: { wallet: w },
      data: { virtualBalance: nextBalance, lastActive: new Date() },
    });

    await tx.transaction.create({
      data: {
        wallet: w,
        type: "lp_deposit",
        amount,
        balanceBefore,
        balanceAfter: nextBalance,
        marketId: isProtocolVault ? null : marketId,
        txHash: hash,
        status: "completed",
        metadata: {
          type: isProtocolVault ? "protocol_vault_deposit" : "lp_deposit",
          poolShare,
          runtime: "express-vps",
        },
      },
    });

    return { balanceAfter: nextBalance };
  });

  const unitsOfTen = Math.floor(amount / 10);
  const liquidityPoints = unitsOfTen * POINT_ACTION_VALUES.LIQUIDITY_ADDED;
  if (liquidityPoints > 0) {
    try {
      await creditWalletPoints(prisma, w, "LIQUIDITY_ADDED", liquidityPoints, {
        marketId,
        amount,
        unitsOfTen,
      });
    } catch (err) {
      console.error("[LP] LIQUIDITY_ADDED points:", err);
    }
  }

  return {
    success: true,
    txHash: hash,
    amount,
    poolShare,
    newBalance: balanceAfter,
    timestamp: timestamp.toISOString(),
    message: isProtocolVault
      ? "Liquidity added to Protocol Vault successfully"
      : "Liquidity added successfully",
  };
}

export async function runWithdrawLiquidityWeb(
  prisma: PrismaClient,
  input: WithdrawLiquidityWebInput,
) {
  const w = normalizeWallet(input.walletAddress);
  const { positionId, amount, claimFees = false } = input;

  const position = await prisma.liquidityPosition.findUnique({
    where: { id: positionId },
  });
  if (!position) throw new Error("LP position not found");
  if (position.userWallet.trim().toLowerCase() !== w) {
    throw new Error("Not authorized");
  }
  if (position.status !== "active") {
    throw new Error("Position is not active");
  }
  if (amount > position.currentValue) {
    throw new Error("Withdrawal amount exceeds position value");
  }

  const isProtocolVault = position.marketId === "protocol-vault";
  const hash = txHash();
  const timestamp = new Date();
  const isFullWithdrawal = amount >= position.currentValue;
  const feesToClaim = claimFees ? position.feesPending : 0;
  const totalWithdrawal = amount + feesToClaim;

  const { newBalance } = await prisma.$transaction(async (tx) => {
    const userRow = await tx.user.findUnique({ where: { wallet: w } });
    if (!userRow) throw new Error("User not found");

    const balanceBefore = userRow.virtualBalance;
    const balanceAfter = balanceBefore + totalWithdrawal;

    if (isFullWithdrawal) {
      await tx.liquidityPosition.update({
        where: { id: positionId },
        data: {
          status: "withdrawn",
          withdrawnAt: timestamp,
          currentValue: 0,
          feesPending: 0,
        },
      });
    } else {
      const newValue = position.currentValue - amount;
      const newDeposit =
        position.depositedAmount * (newValue / position.currentValue);
      await tx.liquidityPosition.update({
        where: { id: positionId },
        data: {
          currentValue: newValue,
          depositedAmount: newDeposit,
        },
      });
    }

    await tx.user.update({
      where: { wallet: w },
      data: { virtualBalance: balanceAfter, lastActive: new Date() },
    });

    await tx.transaction.create({
      data: {
        wallet: w,
        type: "lp_withdraw",
        amount: totalWithdrawal,
        balanceBefore,
        balanceAfter,
        marketId: isProtocolVault ? null : position.marketId,
        txHash: hash,
        status: "completed",
        metadata: {
          type: isProtocolVault ? "protocol_vault_withdraw" : "lp_withdraw",
          feesClaimed: feesToClaim,
          runtime: "express-vps",
        },
      },
    });

    return { newBalance: balanceAfter };
  });

  return {
    success: true,
    txHash: hash,
    amount: totalWithdrawal,
    newBalance,
    timestamp: timestamp.toISOString(),
    message: "Liquidity withdrawn successfully",
  };
}
