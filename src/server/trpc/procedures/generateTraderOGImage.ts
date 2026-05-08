import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { minioClient, minioBaseUrl } from "~/server/minio";
import { createCanvas } from "@napi-rs/canvas";
import { Readable } from "stream";

export const generateTraderOGImage = baseProcedure
  .input(z.object({ 
    walletAddress: z.string(),
    analystId: z.string().optional(),
  }))
  .query(async ({ input }) => {
    // Object storage is optional in local dev.
    if (!minioClient) {
      return {
        url: `${minioBaseUrl}/og-default.png`,
        cached: true,
      };
    }

    // Try to get analyst data first
    let traderData: any = null;
    
    if (input.analystId) {
      traderData = await db.analyst.findUnique({
        where: { id: input.analystId },
      });
    }
    
    // If not an analyst, try to get user data
    if (!traderData) {
      const user = await db.user.findUnique({
        where: { wallet: input.walletAddress },
      });
      
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trader not found",
        });
      }
      
      // Convert user data to trader format
      const totalTrades = user.wins + user.losses;
      traderData = {
        displayName: `${input.walletAddress.slice(0, 6)}...${input.walletAddress.slice(-4)}`,
        wallet: input.walletAddress,
        roi: user.totalPnl > 0 ? (user.totalPnl / user.totalVolume) * 100 : 0,
        winRate: totalTrades > 0 ? (user.wins / totalTrades) * 100 : 0,
        totalPnl: user.totalPnl,
        totalVolume: user.totalVolume,
        totalTrades: user.predictions,
        wins: user.wins,
        losses: user.losses,
        isVerified: false,
      };
    } else {
      // Format analyst data
      traderData = {
        displayName: traderData.displayName,
        wallet: traderData.wallet,
        roi: traderData.roi,
        winRate: traderData.winRate,
        totalPnl: traderData.totalEarned, // Use total earned as proxy for PnL
        totalVolume: traderData.volumeGenerated,
        totalTrades: traderData.totalPredictions,
        isVerified: traderData.isVerified,
        verificationTier: traderData.verificationTier,
        avatar: traderData.avatar,
      };
    }

    const imageKey = `trader-${input.walletAddress}.png`;
    const bucketName = "og-images";
    
    try {
      // Check if image exists and is fresh (< 5 minutes old for trader stats)
      const stats = await minioClient.statObject(bucketName, imageKey);
      const ageSeconds = (Date.now() - stats.lastModified.getTime()) / 1000;
      
      if (ageSeconds < 300) {
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
    const imageBuffer = await generateTraderCardImage(traderData);
    
    // Upload to MinIO with 5-minute cache
    const stream = Readable.from(imageBuffer);
    await minioClient.putObject(
      bucketName,
      imageKey,
      stream,
      imageBuffer.length,
      {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      }
    );

    return {
      url: `${minioBaseUrl}/${bucketName}/${imageKey}`,
      cached: false,
    };
  });

async function generateTraderCardImage(trader: any): Promise<Buffer> {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background - dark gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#080B11");
  gradient.addColorStop(1, "#0F1419");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle noise texture
  for (let i = 0; i < 1000; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.02})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
  }

  // Top accent bar
  ctx.fillStyle = "#00FF87";
  ctx.fillRect(0, 0, width, 4);

  // Predictio.live branding (top left)
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText("PREDICTIO.LIVE", 60, 70);

  // Verified badge (if applicable)
  if (trader.isVerified) {
    const badgeX = width - 180;
    const badgeY = 35;
    
    if (trader.verificationTier === 'elite') {
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(badgeX, badgeY, 120, 40);
      ctx.fillStyle = "#080B11";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⭐ ELITE", badgeX + 60, badgeY + 27);
    } else if (trader.verificationTier === 'partner') {
      ctx.fillStyle = "#9333EA";
      ctx.fillRect(badgeX, badgeY, 140, 40);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🛡️ PARTNER", badgeX + 70, badgeY + 27);
    } else {
      ctx.fillStyle = "#00D4FF";
      ctx.fillRect(badgeX, badgeY, 140, 40);
      ctx.fillStyle = "#080B11";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✓ VERIFIED", badgeX + 70, badgeY + 27);
    }
    ctx.textAlign = "left";
  }

  // Avatar/Icon (large circle)
  const avatarX = 60;
  const avatarY = 120;
  const avatarRadius = 60;
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.beginPath();
  ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Avatar emoji or icon
  ctx.font = "72px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(trader.avatar || "👤", avatarX + avatarRadius, avatarY + avatarRadius);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Trader name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px sans-serif";
  ctx.fillText(trader.displayName, 220, 170);

  // Wallet address
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "24px monospace";
  ctx.fillText(trader.wallet.slice(0, 10) + "..." + trader.wallet.slice(-8), 220, 210);

  // Stats section (2x2 grid)
  const statsY = 300;
  const statHeight = 140;
  const statWidth = 520;
  const gap = 40;

  // ROI (top left)
  ctx.fillStyle = "rgba(0, 255, 135, 0.1)";
  ctx.fillRect(60, statsY, statWidth, statHeight);
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "20px sans-serif";
  ctx.fillText("Return on Investment", 80, statsY + 40);
  ctx.fillStyle = "#00FF87";
  ctx.font = "bold 64px monospace";
  ctx.fillText(`+${trader.roi.toFixed(1)}%`, 80, statsY + 105);

  // Win Rate (top right)
  ctx.fillStyle = "rgba(0, 212, 255, 0.1)";
  ctx.fillRect(60 + statWidth + gap, statsY, statWidth, statHeight);
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "20px sans-serif";
  ctx.fillText("Win Rate", 80 + statWidth + gap, statsY + 40);
  ctx.fillStyle = "#00D4FF";
  ctx.font = "bold 64px monospace";
  ctx.fillText(`${trader.winRate.toFixed(1)}%`, 80 + statWidth + gap, statsY + 105);

  // Total P&L (bottom left)
  const bottomY = statsY + statHeight + 20;
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(60, bottomY, statWidth, 100);
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "18px sans-serif";
  ctx.fillText("Total Profit/Loss", 80, bottomY + 35);
  ctx.fillStyle = trader.totalPnl >= 0 ? "#00FF87" : "#FF4444";
  ctx.font = "bold 40px monospace";
  ctx.fillText(
    `${trader.totalPnl >= 0 ? '+' : ''}$${trader.totalPnl.toLocaleString()}`,
    80,
    bottomY + 75
  );

  // Total Trades (bottom right)
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(60 + statWidth + gap, bottomY, statWidth, 100);
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "18px sans-serif";
  ctx.fillText("Total Trades", 80 + statWidth + gap, bottomY + 35);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px monospace";
  ctx.fillText(trader.totalTrades.toString(), 80 + statWidth + gap, bottomY + 75);

  // Tagline at bottom
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "italic 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Trade on the #1 DeFi Prediction Market", width / 2, height - 40);
  ctx.textAlign = "left";

  return canvas.toBuffer("image/png");
}
