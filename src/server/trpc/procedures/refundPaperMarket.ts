import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";
import { runPaperRefundSettlement } from "~/lib/settlement/paperRefundEngine";
import type { PaperRefundAuthority, PaperRefundReason } from "~/lib/settlement/disputeRefundContract";

const authoritySchema = z.enum(["azuro_graphql", "paper_admin", "client_poll", "unknown"]);

const refundReasonSchema = z.string().min(1).max(64);

export const refundPaperMarket = baseProcedure
  .input(
    z.object({
      marketId: z.string(),
      reason: refundReasonSchema,
      authority: authoritySchema.optional(),
      oracleConditionId: z.string().optional(),
      oracleObservedAt: z.string().datetime().optional(),
      oracleRawOutcome: z.string().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const marketUi = await loadMarketUiById(input.marketId);
    const marketLabel =
      marketUi?.event ??
      (marketUi ? `${marketUi.teamA} vs ${marketUi.teamB}` : input.marketId);

    const authority = (input.authority ?? "unknown") as PaperRefundAuthority;
    const observedAt = input.oracleObservedAt ? new Date(input.oracleObservedAt) : new Date();

    const result = await runPaperRefundSettlement({
      marketId: input.marketId,
      reason: input.reason as PaperRefundReason,
      authority,
      conditionId: input.oracleConditionId ?? null,
      observedAt,
      rawOracle: input.oracleRawOutcome ?? null,
      marketLabel,
    });

    return {
      success: true,
      refundRunId: result.refundRunId,
      idempotent: result.idempotent,
      idempotentReason: result.idempotentReason,
      refundedOrders: result.refundedOrders,
      totalRefundedUsdc: result.totalRefundedUsdc,
      marketUpdated: result.marketUpdated,
      message:
        result.idempotentReason === "market_already_refunded"
          ? "Market already refunded"
          : result.idempotentReason === "no_open_positions"
            ? "No open positions to refund"
            : `Refunded ${result.refundedOrders} position(s)`,
    };
  });
