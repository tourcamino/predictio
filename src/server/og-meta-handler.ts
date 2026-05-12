import { defineEventHandler, setResponseHeader, type H3Event } from "h3";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";
import { minioBaseUrl } from "./minio";
import { getBaseUrl } from "./utils/base-url";
import { db } from "./db";

/** Preview bots / scrapers — short `WhatsApp/x.y` is Meta link-preview fetcher, not the in-app WebView. */
function isOgCrawlerUserAgent(userAgent: string): boolean {
  const ua = userAgent.trim();
  if (/^WhatsApp\/[\d.]+$/i.test(ua)) {
    return true;
  }
  return /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|pinterest|googlebot|bingbot|embedly|quora link preview|vkshare|redditbot/i.test(
    userAgent,
  );
}

export default defineEventHandler(async (event) => {
  try {
    return await handleOgMeta(event);
  } catch (error) {
    console.error("[OG Meta] Unhandled error (falling through to SPA):", error);
    return;
  }
});

async function handleOgMeta(event: H3Event) {
  const req = event.node?.req;
  if (!req) {
    return;
  }

  const url = req.url || "";
  const userAgent = req.headers["user-agent"] || "";
  const isCrawler = isOgCrawlerUserAgent(userAgent);

  // Extract blog slug from URL (e.g., /blog/my-article-slug)
  const blogSlugMatch = url.match(/\/blog\/([^/?]+)/);

  if (blogSlugMatch) {
    if (!isCrawler) {
      return;
    }

    const slug = blogSlugMatch[1];

    try {
      const post = await db.blogPost.findUnique({
        where: { slug },
      });

      if (!post || !post.published) {
        setResponseHeader(event, "Content-Type", "text/html");
        return generateBasicHTML();
      }

      const baseUrl = getBaseUrl();
      const pageUrl = `${baseUrl}/blog/${slug}`;
      const imageUrl = post.featuredImage || `${baseUrl}/og-default.png`;

      setResponseHeader(event, "Content-Type", "text/html");
      return generateBlogMetaHTML({
        title: post.metaTitle || post.title,
        description: post.metaDescription || post.excerpt,
        imageUrl,
        url: pageUrl,
        post,
      });
    } catch (error) {
      console.error("[OG Meta] Error fetching blog post:", error);
    }

    setResponseHeader(event, "Content-Type", "text/html");
    return generateBasicHTML();
  }

  // Extract market ID from URL (e.g., /markets/market-1)
  const marketIdMatch = url.match(/\/markets\/([^/?]+)/);

  if (!marketIdMatch) {
    if (isCrawler) {
      setResponseHeader(event, "Content-Type", "text/html");
      return generateBasicHTML();
    }
    return;
  }

  const marketId = marketIdMatch[1];
  if (!marketId) {
    if (isCrawler) {
      setResponseHeader(event, "Content-Type", "text/html");
      return generateBasicHTML();
    }
    return;
  }

  // Real users: never run Prisma/Azuro in this middleware — it caused cold-start timeouts and 500s on mobile.
  if (!isCrawler) {
    return;
  }

  const market = await loadMarketUiById(marketId);

  if (!market) {
    setResponseHeader(event, "Content-Type", "text/html");
    return generateBasicHTML();
  }

  const ogImageUrl = `${minioBaseUrl}/og-images/market-${marketId}.png`;
  const baseUrl = getBaseUrl();
  const pageUrl = `${baseUrl}/markets/${marketId}`;

  const vol = Number(market.volume);
  const volumeK = Number.isFinite(vol) ? (vol / 1000).toFixed(0) : "0";
  const title = `${market.sportEmoji} ${market.teamA} vs ${market.teamB} - ${market.league}`;
  const predictionCount = market.predictions ?? market.traders ?? 0;
  const pctA = market.percentA ?? Math.round(market.yesPrice * 100);
  const pctB = market.percentB ?? Math.round(market.noPrice * 100);
  const description = `Predict the outcome on Predictio! ${pctA}% ${market.teamA} / ${pctB}% ${market.teamB}. $${volumeK}K volume, ${predictionCount.toLocaleString()} predictions.`;

  setResponseHeader(event, "Content-Type", "text/html");
  return generateMetaHTML({
    title,
    description,
    imageUrl: ogImageUrl,
    url: pageUrl,
    market,
  });
}

function generateBasicHTML() {
  const baseUrl = getBaseUrl();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Predictio.live — DeFi Sports Prediction Markets on Base</title>
  <meta name="description" content="Trade YES/NO tokens on Champions League, Serie A, NBA and more. Powered by Base blockchain.">
  
  <!-- Open Graph -->
  <meta property="og:title" content="Predictio.live — DeFi Sports Prediction Markets on Base">
  <meta property="og:description" content="Trade YES/NO tokens on Champions League, Serie A, NBA and more. Powered by Base blockchain.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${baseUrl}">
  <meta property="og:site_name" content="Predictio.live">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Predictio.live — DeFi Sports Prediction Markets on Base">
  <meta name="twitter:description" content="Trade YES/NO tokens on Champions League, Serie A, NBA and more. Powered by Base blockchain.">
  <meta name="twitter:site" content="@predictio_live">
</head>
<body>
  <h1>Predictio.live</h1>
  <p>Loading...</p>
</body>
</html>`;
}

interface MetaHTMLOptions {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  market: any;
}

function generateMetaHTML(options: MetaHTMLOptions) {
  const { title, description, imageUrl, url, market } = options;
  
  // Format title: [HomeTeam] vs [AwayTeam] · [Competition]
  const metaTitle = `${market.teamA} vs ${market.teamB} · ${market.league}`;
  
  // Format description: Will [Team A] beat [Team B]? Current probability: X%. Trade on Predictio.
  const yesPercent = Math.round(market.yesPrice * 100);
  const metaDescription = `Will ${market.teamA} beat ${market.teamB}? Current probability: ${yesPercent}%. Trade on Predictio.`;
  
  // Twitter title with YES percentage
  const twitterTitle = `${market.teamA} vs ${market.teamB} · ${yesPercent}% YES`;
  const twitterDescription = "Trade the outcome on Predictio.live — DeFi sports prediction markets on Base";
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metaTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(metaTitle)}">
  <meta property="og:description" content="${escapeHtml(metaDescription)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Predictio.live">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(twitterTitle)}">
  <meta name="twitter:description" content="${escapeHtml(twitterDescription)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:site" content="@predictio_live">
  
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}">
</head>
<body>
  <h1>${escapeHtml(metaTitle)}</h1>
  <p>${escapeHtml(metaDescription)}</p>
  <p>Redirecting to <a href="${escapeHtml(url)}">Predictio</a>...</p>
</body>
</html>`;
}

interface BlogMetaHTMLOptions {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  post: any;
}

function generateBlogMetaHTML(options: BlogMetaHTMLOptions) {
  const { title, description, imageUrl, url, post } = options;
  const postTags = Array.isArray(post.tags) ? post.tags : [];

  // Generate JSON-LD structured data for BlogPosting
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": description,
    "image": imageUrl,
    "datePublished": post.createdAt.toISOString(),
    "dateModified": post.updatedAt.toISOString(),
    "author": {
      "@type": "Organization",
      "name": "Predictio",
      "url": getBaseUrl(),
    },
    "publisher": {
      "@type": "Organization",
      "name": "Predictio",
      "logo": {
        "@type": "ImageObject",
        "url": `${getBaseUrl()}/logo.png`,
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url,
    },
    "keywords": postTags.join(", "),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Predictio.live">
  <meta property="article:published_time" content="${post.createdAt.toISOString()}">
  <meta property="article:modified_time" content="${post.updatedAt.toISOString()}">
  ${postTags.map((tag: string) => `<meta property="article:tag" content="${escapeHtml(tag)}">`).join('\n  ')}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:site" content="@predictio_live">
  
  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify(jsonLd, null, 2)}
  </script>
  
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}">
</head>
<body>
  <article>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <p>Redirecting to <a href="${escapeHtml(url)}">Predictio Blog</a>...</p>
  </article>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}
