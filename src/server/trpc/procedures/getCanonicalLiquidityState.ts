import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { resolveCanonicalLiquidityState } from "~/server/services/canonicalLiquidityState";

/** Developer / bot read model — full canonical liquidity snapshot. */
export const getCanonicalLiquidityState = baseProcedure
  .input(z.object({}).optional())
  .query(async () => resolveCanonicalLiquidityState());
