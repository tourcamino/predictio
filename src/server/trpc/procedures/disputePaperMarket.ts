import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  deriveMarketLifecycleFromDbRow,
  MarketLifecycleState,
} from "~/lib/market/marketLifecycleStateMachine";
import { logRefundDev } from "~/lib/settlement/settlementObservability";

/**
 * Mark a paper market as under manual / oracle dispute (no balance movement).
 * Idempotent if already disputed or terminal settled/refunded.
 */
export const disputePaperMarket = baseProcedure
  .input(
    z.object({
      marketId: z.string(),
      disputeReason: z.string().min(1).max(2000),
      oracleSource: z.string().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const row = await db.market.findUnique({ where: { id: input.marketId } });
    if (!row) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Market not found in DB (Azuro-only markets cannot be disputed via this path yet).",
      });
    }

    const life = deriveMarketLifecycleFromDbRow(row);
    if (
      life === MarketLifecycleState.RESOLVED ||
      life === MarketLifecycleState.REFUNDED ||
      life === MarketLifecycleState.CANCELLED
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Cannot move a terminal market into dispute.",
      });
    }

    const updated = await db.market.updateMany({
      where: {
        id: input.marketId,
        status: { notIn: ["resolved", "refunded", "under_review"] },
      },
      data: {
        status: "under_review",
        disputeReason: input.disputeReason,
      },
    });

    logRefundDev("dispute_marked", {
      marketId: input.marketId,
      count: updated.count,
      oracleSource: input.oracleSource,
    });

    return {
      success: true,
      updated: updated.count > 0,
      message: updated.count > 0 ? "Market marked under review" : "Market already under review or blocked",
    };
  });
