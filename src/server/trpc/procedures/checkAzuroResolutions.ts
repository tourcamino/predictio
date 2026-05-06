import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { checkResolvedMarkets } from "~/services/azuro";

export const checkAzuroResolutions = baseProcedure
  .input(
    z.object({
      activeMarketIds: z.array(z.string()),
    })
  )
  .query(async ({ input }) => {
    const resolved = await checkResolvedMarkets(input.activeMarketIds);
    
    return {
      resolvedMarkets: resolved,
      checkedAt: new Date().toISOString(),
    };
  });
