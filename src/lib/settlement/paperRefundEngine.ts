import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";
import {
  canRefundPaperMarket,
  deriveMarketLifecycleFromDbRow,
  deriveMarketLifecycleFromUiMarket,
  logMarketLifecycleDev,
  MarketLifecycleState,
  reasonCannotRefundPaperMarket,
} from "~/lib/market/marketLifecycleStateMachine";
import { buildPaperRefundRunId } from "~/lib/settlement/oracleOutcome";
import type { PaperRefundRunInput } from "~/lib/settlement/disputeRefundContract";
import { REFUND_ENGINE_VERSION } from "~/lib/settlement/disputeRefundContract";
import { logRefundDev, warnSettlementReplay } from "~/lib/settlement/settlementObservability";

type Tx = Prisma.TransactionClient;

export type PaperRefundRunResult = {
  refundRunId: string;
  idempotent: boolean;
  idempotentReason?: "market_already_refunded" | "no_open_positions";
  marketUpdated: boolean;
  refundedOrders: number;
  totalRefundedUsdc: number;
};

async function refundOneOpenOrder(
  tx: Tx,
  position: { id: string; wallet: string; shares: number | null; avgPrice: number | null },
  marketId: string,
  refundRunId: string,
  reason: string,
  authority: string,
  observedAt: Date,
  rawOracle: string | null | undefined,
  conditionId: string | null | undefined,
): Promise<{ orderId: string; wallet: string; claimed: boolean; refundUsdc: number }> {
  const shares = position.shares || 0;
  const avgPrice = position.avgPrice || 0;
  const refundUsdc = shares * avgPrice;

  const claimed = await tx.order.updateMany({
    where: {
      id: position.id,
      marketId,
      status: "open",
    },
    data: {
      status: "resolved",
      pnl: 0,
      resolvedAt: new Date(),
    },
  });

  if (claimed.count === 0) {
    const existing = await tx.transaction.findFirst({
      where: { orderId: position.id, type: "position_refund" },
    });
    if (existing) {
      warnSettlementReplay("refund_ledger_exists", { orderId: position.id, marketId, refundRunId });
    }
    return { orderId: position.id, wallet: position.wallet, claimed: false, refundUsdc };
  }

  const dup = await tx.transaction.findFirst({
    where: { orderId: position.id, type: "position_refund" },
  });
  if (dup) {
    warnSettlementReplay("refund_duplicate_ledger", { orderId: position.id, marketId, refundRunId });
    return { orderId: position.id, wallet: position.wallet, claimed: true, refundUsdc };
  }

  const w = position.wallet.toLowerCase();
  const userBefore = await tx.user.findUnique({ where: { wallet: w } });
  if (!userBefore) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Refund aborted: user missing for wallet ${w}`,
    });
  }

  const balanceBefore = userBefore.virtualBalance;

  await tx.user.update({
    where: { wallet: w },
    data: {
      virtualBalance: { increment: refundUsdc },
      lastActive: new Date(),
    },
  });

  const userAfter = await tx.user.findUnique({ where: { wallet: w } });
  const balanceAfter = userAfter?.virtualBalance ?? balanceBefore + refundUsdc;

  await tx.transaction.create({
    data: {
      wallet: w,
      type: "position_refund",
      amount: refundUsdc,
      balanceBefore,
      balanceAfter,
      marketId,
      orderId: position.id,
      status: "completed",
      metadata: {
        ledgerIntent: "POSITION_REFUND",
        refundRunId,
        refundEngineVersion: REFUND_ENGINE_VERSION,
        reason,
        oracleAuthority: authority,
        oracleObservedAt: observedAt.toISOString(),
        oracleRawOutcome: rawOracle ?? undefined,
        oracleConditionId: conditionId ?? undefined,
        shares,
        avgPrice,
        refundUsdc,
      } satisfies Prisma.InputJsonValue as Prisma.InputJsonValue,
    },
  });

  return { orderId: position.id, wallet: position.wallet, claimed: true, refundUsdc };
}

/**
 * Full stake refund for all **open** paper orders on a market; atomic + idempotent.
 */
export async function runPaperRefundSettlement(
  input: PaperRefundRunInput & { marketLabel: string },
): Promise<PaperRefundRunResult> {
  const { marketId, reason, authority, conditionId, observedAt, rawOracle, marketLabel } = input;
  const refundRunId = buildPaperRefundRunId({
    marketId,
    refundReason: reason,
    conditionId,
    refundEngineVersion: REFUND_ENGINE_VERSION,
  });

  const marketRow = await db.market.findUnique({ where: { id: marketId } });

  let lifecycle: (typeof MarketLifecycleState)[keyof typeof MarketLifecycleState];
  if (marketRow) {
    lifecycle = deriveMarketLifecycleFromDbRow(marketRow);
  } else {
    const ui = await loadMarketUiById(marketId);
    lifecycle = ui ? deriveMarketLifecycleFromUiMarket(ui) : MarketLifecycleState.RESOLVING;
    logMarketLifecycleDev("paperRefund", "no_db_row", { marketId, assumedLifecycle: lifecycle });
  }

  if (lifecycle === MarketLifecycleState.REFUNDED) {
    logRefundDev("skip_idempotent_refunded", { marketId, refundRunId });
    return {
      refundRunId,
      idempotent: true,
      idempotentReason: "market_already_refunded",
      marketUpdated: false,
      refundedOrders: 0,
      totalRefundedUsdc: 0,
    };
  }

  if (lifecycle === MarketLifecycleState.RESOLVED) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Cannot refund a market that was already binary-settled (RESOLVED).",
    });
  }

  if (!canRefundPaperMarket(lifecycle)) {
    logMarketLifecycleDev("paperRefund", "reject", { marketId, lifecycle });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: reasonCannotRefundPaperMarket(lifecycle) ?? "Refund is not allowed for this market state.",
    });
  }

  const openPositions = await db.order.findMany({
    where: { marketId, status: "open" },
  });

  if (openPositions.length === 0) {
    return {
      refundRunId,
      idempotent: true,
      idempotentReason: "no_open_positions",
      marketUpdated: false,
      refundedOrders: 0,
      totalRefundedUsdc: 0,
    };
  }

  logRefundDev("batch_enter", {
    marketId,
    refundRunId,
    orders: openPositions.length,
    reason,
    authority,
  });

  const batch = await db.$transaction(
    async (tx) => {
      let total = 0;
      let count = 0;
      for (const position of openPositions) {
        const r = await refundOneOpenOrder(
          tx,
          position,
          marketId,
          refundRunId,
          reason,
          authority,
          observedAt,
          rawOracle,
          conditionId ?? null,
        );
        if (r.claimed) {
          count++;
          total += r.refundUsdc;
        }
      }

      let marketUpdated = false;
      if (count > 0) {
        const resolutionReason = `REFUND:${reason}`;
        const m = await tx.market.updateMany({
          where: {
            id: marketId,
            status: { not: "refunded" },
          },
          data: {
            status: "refunded",
            winner: null,
            resolvedAt: new Date(),
            resolutionReason,
            voidedAt: new Date(),
            refundAmount: total,
          },
        });
        marketUpdated = m.count > 0;
      }

      return { count, total, marketUpdated };
    },
    { maxWait: 15_000, timeout: 60_000 },
  );

  for (const position of openPositions) {
    const existing = await db.notification.findFirst({
      where: {
        walletAddress: position.wallet.toLowerCase(),
        marketId,
        type: "MARKET_REFUNDED",
        message: { contains: position.id },
      },
    });
    if (!existing) {
      await db.notification
        .create({
          data: {
            walletAddress: position.wallet.toLowerCase(),
            type: "MARKET_REFUNDED",
            title: "Market refunded",
            message: `${marketLabel} — stakes returned (${reason}). Order ${position.id}`,
            marketId,
          },
        })
        .catch(() => {});
    }
  }

  logRefundDev("batch_exit", {
    marketId,
    refundRunId,
    refundedOrders: batch.count,
    total: batch.total,
    marketUpdated: batch.marketUpdated,
  });

  console.log(
    `[Paper Refund] run=${refundRunId} market=${marketId} orders=${batch.count} total=$${batch.total.toFixed(2)} reason=${reason}`,
  );

  return {
    refundRunId,
    idempotent: batch.count === 0 && !batch.marketUpdated,
    marketUpdated: batch.marketUpdated,
    refundedOrders: batch.count,
    totalRefundedUsdc: batch.total,
  };
}
