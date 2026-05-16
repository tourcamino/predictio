import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../middleware/errors";
import {
  POINT_ACTION_VALUES,
  creditWalletPoints,
} from "./pointsLedgerWeb";

export async function runClosePositionWeb(
  prisma: PrismaClient,
  input: {
    orderId: string;
    walletAddress: string;
    sharesToSell: number;
    currentPrice: number;
  },
) {
  const wallet = input.walletAddress.trim().toLowerCase();
  const { orderId, sharesToSell, currentPrice } = input;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { market: true },
  });

  if (!order || order.wallet !== wallet) {
    throw new ApiError("Position not found.", { status: 404, code: "NOT_FOUND" });
  }
  if (order.status !== "open") {
    throw new ApiError("Position is not open", { status: 400, code: "BAD_REQUEST" });
  }
  if (order.market?.status === "resolved") {
    throw new ApiError("This market is resolved.", { status: 400, code: "BAD_REQUEST" });
  }

  const availableShares = order.shares || 0;
  if (sharesToSell > availableShares) {
    throw new ApiError("Insufficient shares", { status: 400, code: "BAD_REQUEST" });
  }

  const proceeds = sharesToSell * currentPrice;
  const costBasis = sharesToSell * (order.avgPrice || 0);
  const realizedPnL = proceeds - costBasis;

  const user = await prisma.user.findUnique({ where: { wallet } });
  if (!user) {
    throw new ApiError("User not found", { status: 404, code: "NOT_FOUND" });
  }

  const balanceBefore = user.virtualBalance;
  const balanceAfter = balanceBefore + proceeds;

  await prisma.user.update({
    where: { wallet },
    data: {
      virtualBalance: balanceAfter,
      totalPnl: user.totalPnl + realizedPnL,
      lastActive: new Date(),
    },
  });

  await prisma.transaction.create({
    data: {
      wallet,
      type: "position_sell",
      amount: proceeds,
      balanceBefore,
      balanceAfter,
      marketId: order.marketId,
      orderId: order.id,
      status: "completed",
      feePaid: 0,
      metadata: {
        ledgerIntent: "POSITION_MARKET_SELL",
        outcome: order.outcome,
        sharesSold: sharesToSell,
        pricePerShare: currentPrice,
        costBasis,
        realizedPnL,
        marketEvent: order.market?.event,
      },
    },
  });

  if (sharesToSell >= availableShares) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "closed",
        pnl: (order.pnl || 0) + realizedPnL,
        resolvedAt: new Date(),
      },
    });
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shares: availableShares - sharesToSell,
        pnl: (order.pnl || 0) + realizedPnL,
      },
    });
  }

  try {
    await creditWalletPoints(prisma, wallet, "TRADE_CLOSED", POINT_ACTION_VALUES.TRADE_CLOSED, {
      orderId,
      marketId: order.marketId,
      sharesSold: sharesToSell,
      proceeds,
    });
  } catch (e) {
    console.error("[web closePosition] points credit failed:", e);
  }

  return {
    success: true,
    proceeds,
    realizedPnL,
    newBalance: balanceAfter,
    message: `Sold ${sharesToSell.toFixed(2)} shares for $${proceeds.toFixed(2)}`,
  };
}
