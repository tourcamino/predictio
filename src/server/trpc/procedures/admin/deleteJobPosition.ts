import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const deleteJobPosition = baseProcedure
  .input(
    z.object({
      adminToken: z.string(),
      id: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Verify admin token
    if (input.adminToken !== process.env.ADMIN_TOKEN) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid admin token",
      });
    }

    await db.jobPosition.delete({
      where: { id: input.id },
    });

    return { success: true };
  });
