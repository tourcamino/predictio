import { defineEventHandler, getHeader, getRequestURL } from "vinxi/http";
import { minioBaseUrl } from "./minio";
import { getBaseUrl } from "./utils/base-url";
import {
  handlerInternalError,
  handlerRequestContext,
  logHandlerDiag,
  logHandlerFailure,
} from "./lib/runtimeHandlerDiagnostics";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" } as const;

function htmlResponse(body: string): Response {
  return new Response(body, { status: 200, headers: HTML_HEADERS });
}

export default defineEventHandler(async (event) => {
  const handler = "og-meta";
  const started = Date.now();
  const reqCtx = handlerRequestContext(event);
  logHandlerDiag(handler, "start", {
    method: reqCtx.method,
    pathname: reqCtx.pathname,
  });

  try {
    const requestUrl = getRequestURL(event);
    const url = requestUrl.pathname + requestUrl.search;
    const userAgent = getHeader(event, "user-agent") ?? "";

    const isCrawler =
      /facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|whatsapp|discordbot/i.test(
        userAgent,
      );

    const blogSlugMatch = url.match(/\/blog\/([^/?]+)/);

    if (blogSlugMatch) {
      const slug = blogSlugMatch[1];
      if (isCrawler) {
        const baseUrl = getBaseUrl();
        const response = htmlResponse(
          generateBasicBlogMetaHTML(`${baseUrl}/blog/${slug}`),
        );
        logHandlerDiag(handler, "done", {
          ...reqCtx,
          status: response.status,
          durationMs: Date.now() - started,
        });
        return response;
      }
      logHandlerDiag(handler, "done", {
        ...reqCtx,
        status: "pass-through",
        durationMs: Date.now() - started,
      });
      return;
    }

    const marketIdMatch = url.match(/\/markets\/([^/?]+)/);

    if (!marketIdMatch) {
      if (isCrawler) {
        const response = htmlResponse(generateBasicHTML());
        logHandlerDiag(handler, "done", {
          ...reqCtx,
          status: response.status,
          durationMs: Date.now() - started,
        });
        return response;
      }
      logHandlerDiag(handler, "done", {
        ...reqCtx,
        status: "pass-through",
        durationMs: Date.now() - started,
      });
      return;
    }

    const marketId = marketIdMatch[1];
    if (!marketId) {
      if (isCrawler) {
        const response = htmlResponse(generateBasicHTML());
        logHandlerDiag(handler, "done", {
          ...reqCtx,
          status: response.status,
          durationMs: Date.now() - started,
        });
        return response;
      }
      logHandlerDiag(handler, "done", {
        ...reqCtx,
        status: "pass-through",
        durationMs: Date.now() - started,
      });
      return;
    }

    const market = await fetchMarketMeta(marketId);

    if (!market) {
      if (isCrawler) {
        const response = htmlResponse(generateBasicHTML());
        logHandlerDiag(handler, "done", {
          ...reqCtx,
          status: response.status,
          durationMs: Date.now() - started,
        });
        return response;
      }
      logHandlerDiag(handler, "done", {
        ...reqCtx,
        status: "pass-through",
        durationMs: Date.now() - started,
      });
      return;
    }

    const ogImageUrl = `${minioBaseUrl}/og-images/market-${marketId}.png`;
    const baseUrl = getBaseUrl();
    const pageUrl = `${baseUrl}/markets/${marketId}`;

    const title = `${market.sportEmoji} ${market.teamA} vs ${market.teamB} - ${market.league}`;
    const predictionCount = market.predictions ?? market.traders ?? 0;
    const pctA = market.percentA ?? Math.round(market.yesPrice * 100);
    const pctB = market.percentB ?? Math.round(market.noPrice * 100);
    const description = `Predict the outcome on Predictio! ${pctA}% ${market.teamA} / ${pctB}% ${market.teamB}. $${(market.volume / 1000).toFixed(0)}K volume, ${predictionCount.toLocaleString()} predictions.`;

    if (isCrawler) {
      const response = htmlResponse(
        generateMetaHTML({
          title,
          description,
          imageUrl: ogImageUrl,
          url: pageUrl,
          market,
        }),
      );
      logHandlerDiag(handler, "done", {
        ...reqCtx,
        status: response.status,
        durationMs: Date.now() - started,
      });
      return response;
    }

    logHandlerDiag(handler, "done", {
      ...reqCtx,
      status: "pass-through",
      durationMs: Date.now() - started,
    });
    return;
  } catch (err) {
    logHandlerFailure(handler, "handler", err, {
      durationMs: Date.now() - started,
    });
    return handlerInternalError(handler, err);
  }
});

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

async function fetchMarketMeta(marketId: string): Promise<any | null> {
  const apiBaseUrl =
    process.env.API_BASE_URL || process.env.VITE_API_URL || "https://api.predictio.live";

  try {
    const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/markets/${marketId}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.market ?? data ?? null;
  } catch (error) {
    logHandlerFailure("og-meta", "fetchMarketMeta", error, { marketId });
    return null;
  }
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

function generateBasicBlogMetaHTML(url: string) {
  const baseUrl = getBaseUrl();
  const title = "Predictio Blog";
  const description =
    "Insights, updates, and guides from Predictio.live.";
  const imageUrl = `${baseUrl}/og-default.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:site_name" content="Predictio.live">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}">
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <p>Redirecting to <a href="${escapeHtml(url)}">Predictio Blog</a>...</p>
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
    "keywords": post.tags.join(", "),
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
  ${post.tags.map((tag: string) => `<meta property="article:tag" content="${escapeHtml(tag)}">`).join('\n  ')}
  
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
