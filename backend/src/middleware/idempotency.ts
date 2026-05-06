import type { NextFunction, Request, Response } from "express";
import { getRedisClient } from "../services/redis";

type Stored = {
  status: number;
  body: any;
  createdAt: string;
};

const PENDING = "__pending__";

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
      if (!redis) {
        return res.status(503).json({
          error: {
            code: "IDEMPOTENCY_UNAVAILABLE",
            message:
              "Idempotency requires Redis. Restore Redis or omit Idempotency-Key for this request.",
          },
        });
      }

      const rawExisting = await redis.get(redisKey);
      if (rawExisting === PENDING) {
        return res.status(409).json({
          error: {
            code: "IDEMPOTENCY_IN_PROGRESS",
            message: "Same idempotency key is being processed; retry shortly.",
          },
        });
      }
      if (rawExisting) {
        let parsed: Stored | undefined;
        try {
          parsed = JSON.parse(rawExisting) as Stored;
        } catch {
          await redis.del(redisKey).catch(() => null);
        }
        if (parsed) {
          return res.status(parsed.status).json(parsed.body);
        }
      }

      const reserved = await redis.set(redisKey, PENDING, { NX: true, EX: ttlSeconds });
      if (!reserved) {
        const again = await redis.get(redisKey);
        if (again && again !== PENDING) {
          try {
            const parsed = JSON.parse(again) as Stored;
            return res.status(parsed.status).json(parsed.body);
          } catch {
            await redis.del(redisKey).catch(() => null);
          }
        }
        return res.status(409).json({
          error: {
            code: "IDEMPOTENCY_IN_PROGRESS",
            message: "Same idempotency key is being processed; retry shortly.",
          },
        });
      }

      const originalJson = res.json.bind(res);
      res.json = ((body: any) => {
        const stored: Stored = {
          status: res.statusCode || 200,
          body,
          createdAt: new Date().toISOString(),
        };
        redis.set(redisKey, JSON.stringify(stored), { EX: ttlSeconds }).catch(() => null);
        return originalJson(body);
      }) as any;

      return next();
    } catch (_e) {
      return next();
    }
  };
}
