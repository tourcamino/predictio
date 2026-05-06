import type { NextFunction, Request, Response } from "express";
import { getRedisClient } from "../services/redis";

type Stored = {
  status: number;
  body: any;
  createdAt: string;
};

function getHeader(req: Request, name: string): string | null {
  const v = req.headers[name.toLowerCase()];
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ? String(v[0]) : null;
  return String(v);
}

export function idempotency({
  headerName = "Idempotency-Key",
  ttlSeconds = 600,
}: {
  headerName?: string;
  ttlSeconds?: number;
} = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = getHeader(req, headerName);
      if (!key) return next();

      const apiKeyId = (req as any).apiKey?.id as string | undefined;
      const walletAddress = (req as any).walletAddress as string | undefined;
      const scope = apiKeyId || walletAddress || "anon";
      const path = (req.originalUrl || req.url || "").split("?")[0];
      const redisKey = `idem:${scope}:${req.method}:${path}:${key}`;

      const redis = await getRedisClient();
      if (!redis) return next();

      const existing = await redis.get(redisKey);
      if (existing) {
        const parsed = JSON.parse(existing) as Stored;
        return res.status(parsed.status).json(parsed.body);
      }

      const originalJson = res.json.bind(res);
      res.json = ((body: any) => {
        const stored: Stored = {
          status: res.statusCode || 200,
          body,
          createdAt: new Date().toISOString(),
        };
        // Store best-effort; don't block the response.
        redis
          .set(redisKey, JSON.stringify(stored), { EX: ttlSeconds })
          .catch(() => null);
        return originalJson(body);
      }) as any;

      return next();
    } catch (_e) {
      // Fail open: never break write paths due to idempotency infra.
      return next();
    }
  };
}

