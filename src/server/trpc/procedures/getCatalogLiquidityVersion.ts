import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { resolveCanonicalLiquidityState } from "~/server/services/canonicalLiquidityState";

/** Lightweight version token for client cache invalidation (catalog-reactive vault). */
export const getCatalogLiquidityVersion = baseProcedure
  .input(z.object({}).optional())
  .query(async () => {
    const state = await resolveCanonicalLiquidityState();
    return {
      allocationVersion: state.allocationVersion,
      rebalanceTriggeredAt: state.rebalanceTriggeredAt,
      source: "canonical-liquidity-state" as const,
    };
  });
