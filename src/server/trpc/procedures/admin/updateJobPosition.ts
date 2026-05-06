import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const updateJobPosition = baseProcedure
  .input(
    z.object({
      adminToken: z.string(),
      id: z.string(),
      title: z.string().min(1).optional(),
      department: z.string().min(1).optional(),
      location: z.string().min(1).optional(),
      type: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      requirements: z.string().min(1).optional(),
      isOpen: z.boolean().optional(),
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

    const { adminToken, id, ...updateData } = input;

    const position = await db.jobPosition.update({
      where: { id },
      data: updateData,
    });

    return position;
  });
