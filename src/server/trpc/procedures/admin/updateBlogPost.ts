import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { fetchUnsplashImage, generateFallbackImageUrl } from "~/services/unsplashService";

export const updateBlogPost = baseProcedure
  .input(
    z.object({
      adminToken: z.string(),
      id: z.string(),
      title: z.string().min(1).optional(),
      content: z.string().min(1).optional(),
      excerpt: z.string().min(1).optional(),
      featuredImage: z.string().optional(),
      tags: z.array(z.string()).optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      published: z.boolean().optional(),
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

    // AI Image Automation: If explicitly setting featuredImage to empty string, fetch new image
    if (input.featuredImage === "") {
      const existingPost = await db.blogPost.findUnique({ where: { id } });
      if (existingPost) {
        console.log("[Blog] Fetching new image from Unsplash...");
        const unsplashImage = await fetchUnsplashImage(
          input.title || existingPost.title,
          input.tags || existingPost.tags
        );
        
        if (unsplashImage) {
          updateData.featuredImage = unsplashImage;
          console.log("[Blog] Using Unsplash image:", unsplashImage);
        } else {
          updateData.featuredImage = generateFallbackImageUrl(
            input.title || existingPost.title
          );
          console.log("[Blog] Using fallback placeholder");
        }
      }
    }

    const post = await db.blogPost.update({
      where: { id },
      data: updateData,
    });

    return post;
  });
