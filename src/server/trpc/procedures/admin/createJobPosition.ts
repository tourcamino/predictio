import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const createJobPosition = baseProcedure
  .input(
    z.object({
      adminToken: z.string(),
      title: z.string().min(1),
      department: z.string().min(1),
      location: z.string().min(1),
      type: z.string().min(1),
      description: z.string().min(1),
      requirements: z.string().min(1),
      isOpen: z.boolean().default(true),
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

    const { adminToken, ...positionData } = input;

    const position = await db.jobPosition.create({
      data: positionData,
    });

    return position;
  });
