import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const getBlogPostDetail = baseProcedure
  .input(
    z.object({
      slug: z.string(),
    })
  )
  .query(async ({ input }) => {
    const post = await db.blogPost.findUnique({
      where: {
        slug: input.slug,
      },
    });

    if (!post) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Blog post not found",
      });
    }

    // Only return published posts to non-admin users
    if (!post.published) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Blog post not found",
      });
    }

    return post;
  });
