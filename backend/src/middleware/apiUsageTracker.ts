import type { NextFunction, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let pruneStarted = false;
function startPruneJob() {
  if (pruneStarted) return;
  pruneStarted = true;

  const days = Number(process.env.API_USAGE_RETENTION_DAYS || 30);
  if (!Number.isFinite(days) || days <= 0) return;

  setInterval(() => {
    const cutoff = new Date(Date.now() - days * 86400 * 1000);
    prisma.apiUsage.deleteMany({ where: { timestamp: { lt: cutoff } } }).catch(() => null);
  }, 6 * 3600 * 1000).unref?.(); // every 6 hours
}

export function apiUsageTracker(req: Request, res: Response, next: NextFunction) {
  if (process.env.API_USAGE_ENABLED === "0" || process.env.API_USAGE_ENABLED === "false") {
    return next();
  }
  startPruneJob();
  const start = Date.now();

  res.on("finish", () => {
    const apiKeyId = (req as any).apiKey?.id as string | undefined;
    if (!apiKeyId) return;

    const endpoint = (req.originalUrl || req.url || "").split("?")[0];

    const latencyMs = Date.now() - start;
    const statusCode = res.statusCode;

    prisma.apiUsage
      .create({
        data: {
          apiKeyId,
          endpoint,
          method: req.method,
          statusCode,
          latencyMs,
        },
      })
      .catch(() => null);
  });

  next();
}

