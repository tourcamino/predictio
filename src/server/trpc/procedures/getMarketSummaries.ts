import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";
import type { Market } from "~/data/mockMarkets";

/** Batch-resolve UI market rows for portfolio / account (Azuro-backed / DB only). */
export const getMarketSummaries = baseProcedure
  .input(
    z.object({
      marketIds: z.array(z.string()).max(80),
    }),
  )
  .query(async ({ input }) => {
    const dedup = [...new Set(input.marketIds)];
    const pairs = await Promise.all(
      dedup.map(async (id) => {
        const m = await loadMarketUiById(id);
        return [id, m] as const;
      }),
    );
    return Object.fromEntries(pairs) as Record<string, Market | null>;
  });
