import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";
import {
  canResolvePaperMarket,
  deriveMarketLifecycleFromDbRow,
  deriveMarketLifecycleFromUiMarket,
  logMarketLifecycleDev,
  MarketLifecycleState,
  reasonCannotResolvePaperMarket,
} from "~/lib/market/marketLifecycleStateMachine";
import { buildPaperSettlementRunId } from "~/lib/settlement/oracleOutcome";
import type { PaperSettlementOracleInput, PaperSettlementRunResult } from "~/lib/settlement/settlementContract";
import { SETTLEMENT_VERSION } from "~/lib/settlement/settlementContract";
import {
  logSettlementDev,
  logSettlementMetric,
  warnOracleMismatch,
  warnSettlementReplay,
} from "~/lib/settlement/settlementObservability";
import { creditWalletPointsIdempotent, POINT_ACTION_VALUES } from "~/server/utils/pointsLedger";

type Tx = Prisma.TransactionClient;

const SETTLEMENT_TX_TYPES = ["position_settlement_win", "position_settlement_loss"] as const;

async function settleOneOrder(
  tx: Tx,
  position: { id: string; wallet: string; outcome: string; shares: number | null; avgPrice: number | null },
  winningOutcome: "YES" | "NO",
  marketId: string,
  settlementRunId: string,
  oracle: PaperSettlementOracleInput,
): Promise<{
  orderId: string;
  wallet: string;
  claimed: boolean;
  isWinner: boolean;
  payout: number;
  pnl: number;
}> {
  const shares = position.shares || 0;
  const avgPrice = position.avgPrice || 0;
  const costBasis = shares * avgPrice;
  const isWinner = position.outcome.toUpperCase() === winningOutcome;
  const payout = isWinner ? shares * 1.0 : 0;
  const pnl = payout - costBasis;

  const claimed = await tx.order.updateMany({
    where: {
      id: position.id,
      marketId,
      status: "open",
    },
    data: {
      status: "resolved",
      pnl,
      resolvedAt: new Date(),
    },
  });

  if (claimed.count === 0) {
    const existingLedger = await tx.transaction.findFirst({
      where: {
        orderId: position.id,
        type: { in: [...SETTLEMENT_TX_TYPES] },
      },
    });
    if (existingLedger) {
      warnSettlementReplay("order_already_settled_ledger_exists", {
        orderId: position.id,
        marketId,
        settlementRunId,
      });
    }
    return {
      orderId: position.id,
      wallet: position.wallet,
      claimed: false,
      isWinner,
      payout,
      pnl,
    };
  }

  const w = position.wallet.toLowerCase();
  const userBefore = await tx.user.findUnique({ where: { wallet: w } });
  if (!userBefore) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Settlement aborted: user missing for wallet ${w}`,
    });
  }

  const balanceBefore = userBefore.virtualBalance;

  await tx.user.update({
    where: { wallet: w },
    data: {
      virtualBalance: { increment: payout },
      totalPnl: { increment: pnl },
      ...(isWinner ? { wins: { increment: 1 } } : { losses: { increment: 1 } }),
      lastActive: new Date(),
    },
  });

  const userAfter = await tx.user.findUnique({ where: { wallet: w } });
  const balanceAfter = userAfter?.virtualBalance ?? balanceBefore + payout;

  await tx.transaction.create({
    data: {
      wallet: w,
      type: isWinner ? "position_settlement_win" : "position_settlement_loss",
      amount: payout,
      balanceBefore,
      balanceAfter,
      marketId,
      orderId: position.id,
      status: "completed",
      metadata: {
        ledgerIntent: "POSITION_SETTLEMENT",
        settlementRunId,
        settlementVersion: SETTLEMENT_VERSION,
        outcome: position.outcome,
        winningOutcome,
        shares,
        payout,
        pnl,
        isWinner,
        oracleSource: oracle.source,
        oracleConditionId: oracle.conditionId ?? undefined,
        oracleObservedAt: oracle.observedAt.toISOString(),
        oracleRawOutcome: oracle.rawOutcome ?? undefined,
      } satisfies Prisma.InputJsonValue as Prisma.InputJsonValue,
    },
  });

  return {
    orderId: position.id,
    wallet: position.wallet,
    claimed: true,
    isWinner,
    payout,
    pnl,
  };
}

/**
 * Atomic, idempotent paper settlement for open orders on a market.
 * Notifications and points run post-commit with dedupe keys.
 */
export async function runPaperBatchSettlement(params: {
  marketId: string;
  winningOutcome: "YES" | "NO";
  oracle: PaperSettlementOracleInput;
  settlementVersion?: number;
  marketLabel: string;
}): Promise<PaperSettlementRunResult> {
  const { marketId, winningOutcome, oracle, marketLabel } = params;
  const settlementVersion = params.settlementVersion ?? SETTLEMENT_VERSION;
  const settlementRunId = buildPaperSettlementRunId({
    marketId,
    winningOutcome,
    conditionId: oracle.conditionId,
    settlementVersion,
  });

  const marketRow = await db.market.findUnique({ where: { id: marketId } });

  let lifecycle: (typeof MarketLifecycleState)[keyof typeof MarketLifecycleState];
  if (marketRow) {
    lifecycle = deriveMarketLifecycleFromDbRow(marketRow);
  } else {
    const ui = await loadMarketUiById(marketId);
    lifecycle = ui
      ? deriveMarketLifecycleFromUiMarket(ui)
      : MarketLifecycleState.RESOLVING;
    logMarketLifecycleDev("paperSettlement", "no_db_row", { marketId, assumedLifecycle: lifecycle });
  }

  if (lifecycle === MarketLifecycleState.RESOLVED) {
    if (marketRow?.winner && marketRow.winner.trim().toUpperCase() !== winningOutcome) {
      warnOracleMismatch({
        marketId,
        existingWinner: marketRow.winner,
        incomingWinner: winningOutcome,
        settlementRunId,
      });
      throw new TRPCError({
        code: "CONFLICT",
        message: "Oracle outcome disagrees with an already-resolved market.",
      });
    }
    logSettlementDev("skip_idempotent_market_resolved", { marketId, settlementRunId });
    return {
      settlementRunId,
      idempotent: true,
      idempotentReason: "market_already_resolved_same_winner",
      marketUpdated: false,
      orders: [],
      settledThisRun: 0,
    };
  }

  if (!canResolvePaperMarket(lifecycle)) {
    logMarketLifecycleDev("paperSettlement", "reject_resolve", { marketId, lifecycle });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: reasonCannotResolvePaperMarket(lifecycle) ?? "Cannot resolve this market.",
    });
  }

  const openPositions = await db.order.findMany({
    where: { marketId, status: "open" },
  });

  if (openPositions.length === 0) {
    return {
      settlementRunId,
      idempotent: true,
      idempotentReason: "no_open_orders",
      marketUpdated: false,
      orders: [],
      settledThisRun: 0,
    };
  }

  logSettlementDev("batch_enter", {
    marketId,
    settlementRunId,
    orders: openPositions.length,
    winningOutcome,
    oracle,
  });

  const batchStarted = Date.now();
  logSettlementMetric("settlement_attempt", {
    marketId,
    settlementRunId,
    openOrders: openPositions.length,
    winningOutcome,
    oracleSource: oracle.source,
    selected_condition_id: oracle.conditionId ?? null,
  });

  const orderResults = await db.$transaction(
    async (tx) => {
      const out: PaperSettlementRunResult["orders"] = [];
      for (const position of openPositions) {
        const row = await settleOneOrder(tx, position, winningOutcome, marketId, settlementRunId, oracle);
        out.push(row);
      }

      const settledThisRun = out.filter((o) => o.claimed).length;
      let marketUpdated = false;
      if (settledThisRun > 0) {
        const m = await tx.market.updateMany({
          where: {
            id: marketId,
            status: { not: "resolved" },
          },
          data: {
            status: "resolved",
            winner: winningOutcome,
            resolvedAt: new Date(),
          },
        });
        marketUpdated = m.count > 0;
      }

      return { orders: out, settledThisRun, marketUpdated };
    },
    { maxWait: 15_000, timeout: 60_000 },
  );

  const settledThisRun = orderResults.settledThisRun;

  for (const r of orderResults.orders) {
    if (!r.claimed) continue;

    const existing = await db.notification.findFirst({
      where: {
        walletAddress: r.wallet.toLowerCase(),
        marketId,
        type: "MARKET_RESOLVED",
        message: { contains: r.orderId },
      },
    });
    if (!existing) {
      const pnlFormatted = r.pnl >= 0 ? `+$${r.pnl.toFixed(2)}` : `-$${Math.abs(r.pnl).toFixed(2)}`;
      await db.notification
        .create({
          data: {
            walletAddress: r.wallet.toLowerCase(),
            type: "MARKET_RESOLVED",
            title: "Market Resolved",
            message: `${marketLabel} — ${winningOutcome} won — order ${r.orderId} · Your PnL: ${pnlFormatted}`,
            marketId,
          },
        })
        .catch((err) => {
          console.error("[settlement] notification create failed:", err);
        });
    } else {
      warnSettlementReplay("notification_exists", { marketId, wallet: r.wallet, settlementRunId });
    }

    if (r.isWinner) {
      await creditWalletPointsIdempotent(
        r.wallet,
        "MARKET_RESOLVED_WIN",
        POINT_ACTION_VALUES.MARKET_RESOLVED_WIN,
        `${settlementRunId}:points:${r.orderId}`,
        { marketId, marketLabel, winningOutcome, settlementRunId, orderId: r.orderId },
      ).catch((err) => {
        console.error("[settlement] points credit failed:", err);
      });
    }
  }

  logSettlementDev("batch_exit", {
    marketId,
    settlementRunId,
    settledThisRun,
    marketUpdated: orderResults.marketUpdated,
  });

  logSettlementMetric("payout_execution_time", {
    marketId,
    settlementRunId,
    ms: Date.now() - batchStarted,
    ledgerWriteSuccess: settledThisRun > 0,
    settledOrders: settledThisRun,
    duplicate_prevented: settledThisRun === 0,
    unresolved_reason: settledThisRun === 0 ? "no_claims" : null,
  });

  console.log(
    `[Paper Settlement] run=${settlementRunId} market=${marketId} settled=${settledThisRun} oracle=${oracle.source}`,
  );

  return {
    settlementRunId,
    idempotent: settledThisRun === 0 && !orderResults.marketUpdated,
    orders: orderResults.orders,
    settledThisRun,
    marketUpdated: orderResults.marketUpdated,
  };
}
