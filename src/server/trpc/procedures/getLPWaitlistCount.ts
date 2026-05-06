import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getLPWaitlistCount = baseProcedure
  .input(z.object({}).optional())
  .query(async ({ input }) => {
    const count = await db.lPWaitlist.count();
    
    return {
      count,
    };
  });
