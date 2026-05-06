import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { z } from "zod";

export const getBlogPosts = baseProcedure
  .input(
    z.object({
      published: z.boolean().optional().default(true),
      limit: z.number().min(1).max(100).optional().default(10),
      offset: z.number().min(0).optional().default(0),
    })
  )
  .query(async ({ input }) => {
    const posts = await db.blogPost.findMany({
      where: {
        published: input.published,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: input.limit,
      skip: input.offset,
    });

    const total = await db.blogPost.count({
      where: {
        published: input.published,
      },
    });

    return {
      posts,
      total,
      hasMore: input.offset + input.limit < total,
    };
  });
