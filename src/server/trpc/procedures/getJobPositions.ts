import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { z } from "zod";

export const getJobPositions = baseProcedure
  .input(
    z.object({
      isOpen: z.boolean().optional().default(true),
      department: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const positions = await db.jobPosition.findMany({
      where: {
        isOpen: input.isOpen,
        ...(input.department && { department: input.department }),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return positions;
  });
