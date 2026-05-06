import type { NextFunction, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function apiUsageTracker(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const apiKeyId = (req as any).apiKey?.id as string | undefined;
    if (!apiKeyId) return;

    const endpoint = req.baseUrl
      ? `${req.baseUrl}${req.path || ""}`
      : (req.originalUrl || req.url || "").split("?")[0];

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

