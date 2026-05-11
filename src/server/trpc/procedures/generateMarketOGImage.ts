import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { minioClient, minioBaseUrl } from "~/server/minio";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";
import { Readable } from "stream";

/** Dynamic import: @napi-rs/canvas native addon crashes many serverless runtimes if loaded at cold-start. */

export const generateMarketOGImage = baseProcedure
  .input(z.object({ marketId: z.string() }))
  .query(async ({ input }) => {
    const market = await loadMarketUiById(input.marketId);

    if (!market) {
      return {
        url: `${minioBaseUrl}/og-default.png`,
        cached: true,
      };
    }

    const imageKey = `market-${input.marketId}.png`;
    const bucketName = "og-images";

    // Object storage is optional in local dev.
    if (!minioClient) {
      return {
        url: `${minioBaseUrl}/og-default.png`,
        cached: true,
      };
    }
    
    try {
      // Check if image exists and is fresh (< 60 seconds old)
      const stats = await minioClient.statObject(bucketName, imageKey);
      const ageSeconds = (Date.now() - stats.lastModified.getTime()) / 1000;
      
      if (ageSeconds < 60) {
        // Image is fresh, return existing URL
        return {
          url: `${minioBaseUrl}/${bucketName}/${imageKey}`,
          cached: true,
        };
      }
    } catch (error) {
      // Image doesn't exist or error checking, will regenerate
    }

    // Generate new OG image
    let imageBuffer: Buffer;
    try {
      imageBuffer = await generateMarketCardImage(market);
    } catch (e) {
      console.warn("[generateMarketOGImage] Canvas/render failed, using default:", e);
      return {
        url: `${minioBaseUrl}/og-default.png`,
        cached: true,
      };
    }

    const stream = Readable.from(imageBuffer);
    await minioClient.putObject(
      bucketName,
      imageKey,
      stream,
      imageBuffer.length,
      {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60",
      }
    );

    return {
      url: `${minioBaseUrl}/${bucketName}/${imageKey}`,
      cached: false,
    };
  });

async function generateMarketCardImage(market: any): Promise<Buffer> {
  const { createCanvas } = await import("@napi-rs/canvas");
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background - solid dark
  ctx.fillStyle = "#080B11";
  ctx.fillRect(0, 0, width, height);

  // Add subtle noise texture
  for (let i = 0; i < 1000; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.02})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
  }

  // Top bar accent
  ctx.fillStyle = "#00FF87";
  ctx.fillRect(0, 0, width, 4);

  // Predictio.live branding (top left)
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText("PREDICTIO.LIVE", 60, 80);

  // Competition badge (top right)
  ctx.fillStyle = "#00D4FF";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(market.league.toUpperCase(), width - 60, 80);
  ctx.textAlign = "left";

  // Team A
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px sans-serif";
  ctx.fillText(market.teamA, 60, 200);

  // VS
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "bold 48px sans-serif";
  ctx.fillText("VS", 60, 270);

  // Team B
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px sans-serif";
  ctx.fillText(market.teamB, 60, 340);

  // Probability bar background
  const barY = 400;
  const barHeight = 60;
  const barWidth = width - 120;
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(60, barY, barWidth, barHeight);

  // YES side (green)
  const yesPercent = Math.round(market.yesPrice * 100);
  const yesWidth = (barWidth * market.yesPrice);
  ctx.fillStyle = "#00FF87";
  ctx.fillRect(60, barY, yesWidth, barHeight);

  // NO side (red)
  const noPercent = Math.round(market.noPrice * 100);
  ctx.fillStyle = "#FF4444";
  ctx.fillRect(60 + yesWidth, barY, barWidth - yesWidth, barHeight);

  // Percentage labels on bar
  ctx.fillStyle = "#080B11";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${yesPercent}% YES`, 60 + yesWidth / 2, barY + 42);
  
  if (noPercent > 15) { // Only show NO label if there's enough space
    ctx.fillText(`${noPercent}% NO`, 60 + yesWidth + (barWidth - yesWidth) / 2, barY + 42);
  }
  ctx.textAlign = "left";

  // Bottom info section
  const bottomY = 510;
  
  // Volume
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "20px sans-serif";
  ctx.fillText("Volume:", 60, bottomY);
  ctx.fillStyle = "#00FF87";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(`$${(market.volume / 1000).toFixed(1)}K`, 60, bottomY + 35);

  // Closing date
  const closesDate = new Date(market.closesAt);
  const now = new Date();
  const hoursUntilClose = (closesDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "20px sans-serif";
  ctx.fillText("Closes:", 300, bottomY);
  
  if (hoursUntilClose < 0) {
    ctx.fillStyle = "#FF4444";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("CLOSED", 300, bottomY + 35);
  } else if (hoursUntilClose < 6) {
    ctx.fillStyle = "#FF9500";
    ctx.font = "bold 28px sans-serif";
    const hours = Math.floor(hoursUntilClose);
    const minutes = Math.floor((hoursUntilClose - hours) * 60);
    ctx.fillText(`${hours}h ${minutes}m`, 300, bottomY + 35);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    const dateStr = closesDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    ctx.fillText(dateStr, 300, bottomY + 35);
  }

  // LIVE badge or closing soon badge (top right area)
  if (market.status === 'closing-soon' || hoursUntilClose < 1) {
    const badgeX = width - 220;
    const badgeY = 400;
    
    // Red pulsing LIVE badge
    ctx.fillStyle = "#FF4444";
    ctx.fillRect(badgeX, badgeY, 160, 50);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🔴 LIVE", badgeX + 80, badgeY + 33);
    ctx.textAlign = "left";
  } else if (hoursUntilClose < 6) {
    const badgeX = width - 280;
    const badgeY = 400;
    
    // Orange closing soon badge
    ctx.fillStyle = "#FF9500";
    ctx.fillRect(badgeX, badgeY, 220, 50);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    const hours = Math.floor(hoursUntilClose);
    ctx.fillText(`⏰ Closes in ${hours}h`, badgeX + 110, badgeY + 33);
    ctx.textAlign = "left";
  }

  // Tagline at bottom
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "italic 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Trade the outcome on Base", width / 2, height - 40);
  ctx.textAlign = "left";

  return canvas.toBuffer("image/png");
}
