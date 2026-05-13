import { defineEventHandler, setResponseHeader, sendRedirect } from "h3";
import { minioBaseUrl } from "./minio";

export default defineEventHandler(async (event) => {
  const req = event.node?.req;
  const res = event.node?.res;
  if (!req || !res) {
    return "Bad request";
  }

  const url = req.url || "";

  // Extract market ID from URL (e.g., /api/og/market-1)
  const marketIdMatch = url.match(/\/api\/og\/([^/?]+)/);

  if (!marketIdMatch?.[1]) {
    setResponseHeader(event, "Content-Type", "text/plain");
    res.statusCode = 400;
    return "Missing market ID";
  }

  const marketId = marketIdMatch[1];

  // Redirect to the MinIO URL for the OG image
  const imageUrl = `${minioBaseUrl}/og-images/market-${marketId}.png`;
  
  // Set cache headers
  setResponseHeader(event, "Cache-Control", "public, max-age=60");
  
  // Redirect to the actual image
  return sendRedirect(event, imageUrl, 302);
});
