import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const verifyAnalyst = baseProcedure
  .input(
    z.object({
      analystId: z.string(),
      verificationTier: z.enum(['trusted', 'elite', 'partner']).default('trusted'),
    })
  )
  .mutation(async ({ input }) => {
    const analyst = await db.analyst.findUnique({
      where: { id: input.analystId },
    });

    if (!analyst) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Analyst not found",
      });
    }

    const updated = await db.analyst.update({
      where: { id: input.analystId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verificationTier: input.verificationTier,
      },
    });

    return {
      success: true,
      analyst: updated,
    };
  });

export const unverifyAnalyst = baseProcedure
  .input(
    z.object({
      analystId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const analyst = await db.analyst.findUnique({
      where: { id: input.analystId },
    });

    if (!analyst) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Analyst not found",
      });
    }

    const updated = await db.analyst.update({
      where: { id: input.analystId },
      data: {
        isVerified: false,
        verifiedAt: null,
        verificationTier: null,
      },
    });

    return {
      success: true,
      analyst: updated,
    };
  });
