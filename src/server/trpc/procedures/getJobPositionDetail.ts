import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const getJobPositionDetail = baseProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .query(async ({ input }) => {
    const position = await db.jobPosition.findUnique({
      where: {
        id: input.id,
      },
    });

    if (!position) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Job position not found",
      });
    }

    return position;
  });
