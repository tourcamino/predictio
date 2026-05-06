import { env } from "~/server/env";

interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
  };
}

interface UnsplashSearchResponse {
  results: UnsplashImage[];
  total: number;
  total_pages: number;
}

/**
 * Extract search keywords from article title
 * Examples:
 * - "NBA Finals Preview" -> "basketball"
 * - "Champions League Analysis" -> "soccer football"
 * - "Crypto Market Update" -> "cryptocurrency bitcoin"
 */
function extractSearchKeywords(title: string): string {
  const titleLower = title.toLowerCase();
  
  // Sport-specific keywords
  if (titleLower.includes("nba") || titleLower.includes("basketball")) {
    return "basketball game";
  }
  if (titleLower.includes("nfl") || titleLower.includes("football") && !titleLower.includes("soccer")) {
    return "american football";
  }
  if (titleLower.includes("soccer") || titleLower.includes("champions league") || 
      titleLower.includes("premier league") || titleLower.includes("serie a")) {
    return "soccer football stadium";
  }
  if (titleLower.includes("mma") || titleLower.includes("ufc")) {
    return "mixed martial arts fighting";
  }
  if (titleLower.includes("tennis")) {
    return "tennis court";
  }
  if (titleLower.includes("cricket")) {
    return "cricket sport";
  }
  if (titleLower.includes("baseball")) {
    return "baseball stadium";
  }
  
  // Crypto/DeFi keywords
  if (titleLower.includes("crypto") || titleLower.includes("bitcoin") || 
      titleLower.includes("ethereum") || titleLower.includes("defi")) {
    return "cryptocurrency blockchain";
  }
  
  // Trading/Finance keywords
  if (titleLower.includes("trading") || titleLower.includes("market") || 
      titleLower.includes("prediction")) {
    return "trading charts finance";
  }
  
  // Technology keywords
  if (titleLower.includes("ai") || titleLower.includes("artificial intelligence")) {
    return "artificial intelligence technology";
  }
  
  // Generic fallback - extract key nouns
  const words = titleLower.split(/\s+/);
  const meaningfulWords = words.filter(word => 
    word.length > 4 && 
    !["about", "guide", "update", "analysis", "preview", "review"].includes(word)
  );
  
  if (meaningfulWords.length > 0) {
    return meaningfulWords.slice(0, 2).join(" ");
  }
  
  // Final fallback
  return "sports technology";
}

/**
 * Fetch a relevant image from Unsplash based on article context
 */
export async function fetchUnsplashImage(
  title: string,
  tags: string[] = []
): Promise<string | null> {
  const accessKey = env.UNSPLASH_ACCESS_KEY;
  
  if (!accessKey) {
    console.warn("UNSPLASH_ACCESS_KEY not configured, skipping image fetch");
    return null;
  }
  
  try {
    // Combine title and tags for better context
    const searchQuery = extractSearchKeywords(title);
    
    // Add tags if they provide additional context
    const relevantTags = tags
      .filter(tag => tag.length > 3)
      .slice(0, 2)
      .join(" ");
    
    const finalQuery = relevantTags 
      ? `${searchQuery} ${relevantTags}` 
      : searchQuery;
    
    console.log(`[Unsplash] Searching for: "${finalQuery}"`);
    
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(finalQuery)}&per_page=10&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      }
    );
    
    if (!response.ok) {
      console.error(`[Unsplash] API error: ${response.status}`);
      return null;
    }
    
    const data: UnsplashSearchResponse = await response.json();
    
    if (data.results.length === 0) {
      console.warn(`[Unsplash] No images found for query: "${finalQuery}"`);
      return null;
    }
    
    // Get the first high-quality image (1200x630 for OG tags)
    const image = data.results[0];
    if (!image) {
      return null;
    }
    const imageUrl = `${image.urls.raw}&w=1200&h=630&fit=crop`;
    
    console.log(`[Unsplash] Selected image by ${image.user.name}: ${imageUrl}`);
    
    return imageUrl;
  } catch (error) {
    console.error("[Unsplash] Error fetching image:", error);
    return null;
  }
}

/**
 * Generate a brand-colored fallback placeholder image URL
 * Uses a simple gradient with Predictio brand colors
 */
export function generateFallbackImageUrl(title: string): string {
  // Use a gradient generator service with Predictio brand colors
  // #00FFA3 (brand green) and #0A0F1E (brand dark)
  const encodedTitle = encodeURIComponent(title.slice(0, 50));
  
  // Using a simple gradient as fallback
  // In production, you might want to generate these server-side or use a service
  return `https://via.placeholder.com/1200x630/0A0F1E/00FFA3?text=${encodedTitle}`;
}
