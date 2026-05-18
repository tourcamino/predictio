import type { PrismaClient } from "@prisma/client";
import { logPurchaseFlowExpress } from "../lib/purchaseFlowDiagnostic";
import { ApiError } from "../middleware/errors";
import {
  calculateFeeSplit,
  persistFeeSplit,
  TAKER_FEE_RATE,
} from "../services/fees";
import { mirrorTradeToActiveCopiers } from "../services/mirrorCopyTrades";
import {
  POINT_ACTION_VALUES,
  creditWalletPoints,
} from "./pointsLedgerWeb";
import {
  ensurePaperMarketRow,
  loadPaperMarketSnapshot,
  marketEventLabel,
} from "./paperMarket";
import {
  executePaperAmmMarketBuy,
  persistAmmOutcomesAfterFill,
} from "../services/paperAmmExecution";
import type { PaperAmmSide } from "../services/paperAmmEngine";

function getOrderRole(orderType: "MARKET" | "LIMIT"): "MAKER" | "TAKER" {
  return orderType === "LIMIT" ? "MAKER" : "TAKER";
}

async function bumpMarketPaperStats(
  prisma: PrismaClient,
  marketId: string,
  volumeDelta: number,
) {
  try {
    await prisma.market.update({
      where: { id: marketId },
      data: {
        volume: { increment: volumeDelta },
        predictions: { increment: 1 },
      },
    });
  } catch {
    /* ignore */
  }
}

export async function runPlacePaperPredictionWeb(
  prisma: PrismaClient,
  input: {
    marketId: string;
    outcome: string;
    amount: number;
    walletAddress: string;
    orderType?: "MARKET" | "LIMIT";
    limitPrice?: number;
  },
  diag?: { requestId: string },
) {
  // #region agent log
  const purchaseDiagRequestId = diag?.requestId ?? "no-request-id";
  const purchaseDiagUserId = input.walletAddress?.trim().toLowerCase() ?? null;
  logPurchaseFlowExpress({
    requestId: purchaseDiagRequestId,
    userId: purchaseDiagUserId,
    location: "placePaperPredictionWeb.ts:runPlacePaperPredictionWeb",
    phase: "express.web.place_prediction.enter",
    payloadReceived: {
      marketId: input.marketId,
      outcome: input.outcome,
      amount: input.amount,
      orderType: input.orderType,
      limitPrice: input.limitPrice,
    },
  });
  // #endregion

  const market = await loadPaperMarketSnapshot(prisma, input.marketId);
  if (!market) {
    throw new ApiError("Market not found.", { status: 404, code: "NOT_FOUND" });
  }

  if (market.start_time && new Date() >= market.start_time) {
    throw new ApiError("Trading is closed — kickoff has passed.", {
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  if (market.status === "resolved") {
    throw new ApiError("This market is resolved.", { status: 400, code: "BAD_REQUEST" });
  }

  if (market.closesAt < new Date()) {
    throw new ApiError("This market has already closed", {
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  const upperOutcome = input.outcome.toUpperCase();
  const allowDraw = market.percentDraw != null && market.percentDraw > 0;
  const outcomeOk =
    upperOutcome === "YES" ||
    upperOutcome === "NO" ||
    (allowDraw && upperOutcome === "DRAW");

  if (!outcomeOk) {
    throw new ApiError("Invalid outcome", { status: 400, code: "BAD_REQUEST" });
  }

  const wallet = input.walletAddress.trim().toLowerCase();
  if (!wallet) {
    throw new ApiError("Wallet address is required", { status: 400, code: "BAD_REQUEST" });
  }

  const orderType = input.orderType ?? "MARKET";
  if (orderType === "LIMIT" && input.limitPrice == null) {
    throw new ApiError("Limit price is required for limit orders", {
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  const user = await prisma.user.upsert({
    where: { wallet },
    create: {
      wallet,
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

  await ensurePaperMarketRow(prisma, input.marketId, market);

  const dbMarketRow = await prisma.market.findUnique({
    where: { id: input.marketId },
    select: { outcomes: true },
  });

  const predictionId = `pred-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const balanceBefore = user.virtualBalance;

  const oracleYes = market.yesPrice;
  const oracleNo = market.noPrice;
  const oracleDraw =
    market.percentDraw != null && market.percentDraw > 0
      ? market.percentDraw / 100
      : null;

  let effectivePrice: number;
  let shares: number;

  if (orderType === "MARKET") {
    const ammFill = await executePaperAmmMarketBuy(prisma, {
      marketId: input.marketId,
      side: upperOutcome as PaperAmmSide,
      amountUsd: input.amount,
      oracleYes,
      oracleNo,
      oracleDraw,
      existingOutcomes: dbMarketRow?.outcomes ?? null,
    });
    effectivePrice = ammFill.avgPrice;
    shares = ammFill.shares;
    await persistAmmOutcomesAfterFill(prisma, input.marketId, ammFill.newOutcomes);
  } else {
    const currentPrice =
      upperOutcome === "YES"
        ? market.yesPrice
        : upperOutcome === "DRAW" && market.percentDraw != null
          ? market.percentDraw / 100
          : market.noPrice;

    if (!Number.isFinite(currentPrice) || currentPrice <= 0 || currentPrice >= 1) {
      throw new ApiError("Invalid market price — cannot execute trade.", {
        status: 400,
        code: "BAD_REQUEST",
      });
    }

    effectivePrice = input.limitPrice ?? currentPrice;
    shares = input.amount / effectivePrice;
  }

  if (!Number.isFinite(effectivePrice) || effectivePrice <= 0 || effectivePrice >= 1) {
    throw new ApiError("Invalid execution price — cannot execute trade.", {
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  if (!Number.isFinite(shares) || shares <= 0) {
    throw new ApiError("Could not compute share size for this trade.", {
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  const fee = orderType === "LIMIT" ? 0 : input.amount * TAKER_FEE_RATE;
  const orderRole = getOrderRole(orderType);
  const totalCost = input.amount + fee;

  if (totalCost > balanceBefore) {
    throw new ApiError(
      `Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${balanceBefore.toFixed(2)}`,
      { status: 400, code: "BAD_REQUEST" },
    );
  }

  const balanceAfter = balanceBefore - totalCost;

  await prisma.user.update({
    where: { wallet },
    data: {
      virtualBalance: balanceAfter,
      tradesCount: { increment: 1 },
      totalVolume: { increment: input.amount },
      predictions: { increment: 1 },
      lastActive: new Date(),
    },
  });

  let odds = 1.0;
  if (upperOutcome === "YES") odds = 1 / market.yesPrice;
  else if (upperOutcome === "NO") odds = 1 / market.noPrice;
  else if (upperOutcome === "DRAW" && market.percentDraw != null) {
    const p = market.percentDraw / 100;
    odds = p > 0 ? 1 / p : 1;
  }

  await prisma.transaction.create({
    data: {
      wallet,
      type: "position_open",
      amount: input.amount,
      balanceBefore,
      balanceAfter,
      marketId: input.marketId,
      orderId: predictionId,
      status: "completed",
      feePaid: fee,
      metadata: {
        outcome: input.outcome,
        odds,
        potentialWin: shares * 1.0,
        marketEvent: marketEventLabel(market),
        sport: market.sport,
        orderType,
        orderRole,
        limitPrice: input.limitPrice,
        shares,
        avgPrice: effectivePrice,
      },
    },
  });

  await prisma.order.create({
    data: {
      id: predictionId,
      marketId: input.marketId,
      wallet,
      outcome: upperOutcome,
      amount: input.amount,
      shares,
      avgPrice: effectivePrice,
      status: "open",
      orderType,
      limitPrice: input.limitPrice,
      heldSince: new Date(),
    },
  });

  // #region agent log
  logPurchaseFlowExpress({
    requestId: purchaseDiagRequestId,
    userId: purchaseDiagUserId,
    location: "placePaperPredictionWeb.ts:after_order_create",
    phase: "express.web.db.order_created",
    dbWrite: {
      model: "Order",
      summary: {
        id: predictionId,
        marketId: input.marketId,
        wallet,
        outcome: upperOutcome,
        amount: input.amount,
        shares,
        avgPrice: effectivePrice,
        orderType,
      },
    },
  });
  // #endregion

  await bumpMarketPaperStats(prisma, input.marketId, input.amount);

  try {
    const analyst = await prisma.analyst.findUnique({ where: { wallet } });
    if (analyst) {
      await mirrorTradeToActiveCopiers({
        prisma,
        analystWallet: wallet,
        analystDisplayName: analyst.displayName,
        marketId: input.marketId,
        outcome: String(input.outcome),
        avgPrice: effectivePrice,
      });
    }
  } catch (e) {
    console.error("[web placePrediction] copy mirror failed:", e);
  }

  if (fee > 0) {
    try {
      const copyRelationship = await prisma.copyRelationship.findFirst({
        where: { copierWallet: wallet, isActive: true },
      });
      const referralTracking = await prisma.referralTracking.findUnique({
        where: { referredWallet: wallet },
      });
      const referralWallet =
        referralTracking?.refCode != null
          ? (
              await prisma.affiliate.findUnique({
                where: { refCode: referralTracking.refCode },
              })
            )?.walletAddress?.toLowerCase() ?? null
          : null;

      const split = calculateFeeSplit({
        tradeId: predictionId,
        traderWallet: wallet,
        volumeUsd: input.amount,
        analystWallet: copyRelationship?.analystWallet ?? null,
        referralWallet,
      });

      await persistFeeSplit({
        prisma,
        input: {
          tradeId: predictionId,
          traderWallet: wallet,
          volumeUsd: input.amount,
          analystWallet: copyRelationship?.analystWallet ?? null,
          referralWallet,
        },
        split,
      });
    } catch (e) {
      console.error("[web placePrediction] fee split failed:", e);
    }
  }

  await prisma.notification
    .create({
      data: {
        walletAddress: wallet,
        type: "TRADE_FILLED",
        title: "Trade filled",
        message: `${input.outcome.toUpperCase()} · $${input.amount.toFixed(2)} on ${marketEventLabel(market)} · ~${shares.toFixed(2)} shares @ $${effectivePrice.toFixed(3)}`,
        marketId: input.marketId,
      },
    })
    .catch(() => null);

  try {
    const firstTradeEntry = await prisma.pointsLedger.findFirst({
      where: { walletAddress: wallet, actionType: "FIRST_TRADE" },
    });
    if (!firstTradeEntry) {
      await creditWalletPoints(prisma, wallet, "FIRST_TRADE", 500, {
        marketId: input.marketId,
      });
    }
    await creditWalletPoints(prisma, wallet, "TRADE_PLACED", 50, {
      marketId: input.marketId,
      amount: input.amount,
      outcome: input.outcome,
    });
  } catch (e) {
    console.error("[web placePrediction] points credit failed:", e);
  }

  const apiResponse = {
    success: true,
    predictionId,
    message:
      orderType === "LIMIT"
        ? "Limit order placed successfully (0% fee)"
        : "Prediction placed successfully",
    newBalance: balanceAfter,
    fee,
    orderRole,
  };

  // #region agent log
  logPurchaseFlowExpress({
    requestId: purchaseDiagRequestId,
    userId: purchaseDiagUserId,
    location: "placePaperPredictionWeb.ts:runPlacePaperPredictionWeb",
    phase: "express.web.place_prediction.success",
    apiResponse,
  });
  // #endregion

  return apiResponse;
}
