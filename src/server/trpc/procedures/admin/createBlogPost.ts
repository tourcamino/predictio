import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { fetchUnsplashImage, generateFallbackImageUrl } from "~/services/unsplashService";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const createBlogPost = baseProcedure
  .input(
    z.object({
      adminToken: z.string(),
      title: z.string().min(1),
      content: z.string().min(1),
      excerpt: z.string().min(1),
      featuredImage: z.string().optional(),
      tags: z.array(z.string()).default([]),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      published: z.boolean().default(false),
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

    // Generate slug from title
    const slug = generateSlug(input.title);
    
    // Ensure slug is unique
    let counter = 1;
    let uniqueSlug = slug;
    while (await db.blogPost.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    // AI Image Automation: Fetch image from Unsplash if not provided
    let finalFeaturedImage = input.featuredImage;
    
    if (!finalFeaturedImage) {
      console.log("[Blog] No featured image provided, fetching from Unsplash...");
      const unsplashImage = await fetchUnsplashImage(input.title, input.tags);
      
      if (unsplashImage) {
        finalFeaturedImage = unsplashImage;
        console.log("[Blog] Using Unsplash image:", unsplashImage);
      } else {
        // Fallback to brand-colored placeholder
        finalFeaturedImage = generateFallbackImageUrl(input.title);
        console.log("[Blog] Using fallback placeholder");
      }
    }

    const post = await db.blogPost.create({
      data: {
        title: input.title,
        slug: uniqueSlug,
        content: input.content,
        excerpt: input.excerpt,
        featuredImage: finalFeaturedImage,
        tags: input.tags,
        metaTitle: input.metaTitle || input.title,
        metaDescription: input.metaDescription || input.excerpt,
        published: input.published,
      },
    });

    return post;
  });
