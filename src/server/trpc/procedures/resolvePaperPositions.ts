import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";
import { isBinaryPaperSettlementBlockedByOracleUi } from "~/lib/market/marketLifecycleStateMachine";
import type { PaperOracleSource } from "~/lib/settlement/settlementContract";
import { runPaperBatchSettlement } from "~/lib/settlement/paperSettlementEngine";

const oracleSourceSchema = z.enum([
  "azuro_graphql",
  "client_poll",
  "paper_admin",
  "autonomous_bot",
  "unknown",
]);

export const resolvePaperPositions = baseProcedure
  .input(
    z.object({
      marketId: z.string(),
      winningOutcome: z.enum(["YES", "NO"]),
      oracleSource: oracleSourceSchema.optional(),
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

    if (marketUi && isBinaryPaperSettlementBlockedByOracleUi(marketUi)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Non-binary oracle outcome (e.g. draw). Use refundPaperMarket or disputePaperMarket instead of binary settlement.",
      });
    }

    const source = (input.oracleSource ?? "unknown") as PaperOracleSource;
    const observedAt = input.oracleObservedAt ? new Date(input.oracleObservedAt) : new Date();

    const result = await runPaperBatchSettlement({
      marketId: input.marketId,
      winningOutcome: input.winningOutcome,
      oracle: {
        source,
        conditionId: input.oracleConditionId ?? null,
        observedAt,
        rawOutcome: input.oracleRawOutcome ?? null,
      },
      marketLabel,
    });

    const winners = result.orders.filter((u) => u?.claimed && u.isWinner).length;
    const losers = result.orders.filter((u) => u?.claimed && !u.isWinner).length;

    return {
      success: true,
      settlementRunId: result.settlementRunId,
      idempotent: result.idempotent,
      idempotentReason: result.idempotentReason,
      resolvedCount: result.settledThisRun,
      winners,
      losers,
      marketUpdated: result.marketUpdated,
      message:
        result.idempotentReason === "market_already_resolved_same_winner"
          ? "Market already resolved"
          : result.idempotentReason === "no_open_orders"
            ? "No open positions to resolve"
            : `Resolved ${result.settledThisRun} positions`,
    };
  });
