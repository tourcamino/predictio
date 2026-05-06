import type { NextFunction, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyAPIKey as verifyAPIKeyHash } from "../utils/apiKey";
import { ApiError } from "./errors";

const prisma = new PrismaClient();

function headerString(req: Request, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function requireStaticKey(opts: {
  headerName: string;
  envName: string;
  fallbackEnvName?: string;
}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const presented = headerString(req, opts.headerName);
    const expected = process.env[opts.envName];
    const fallback = opts.fallbackEnvName ? process.env[opts.fallbackEnvName] : undefined;

    const ok =
      (expected && presented === expected) ||
      (!expected && fallback && presented === fallback);

    if (!ok) {
      return next(new ApiError("Unauthorized", { status: 401, code: "UNAUTHORIZED" }));
    }

    if (!expected && fallback) {
      // eslint-disable-next-line no-console
      console.warn(`[auth] ${opts.envName} not set, falling back to ${opts.fallbackEnvName}`);
    }

    return next();
  };
}

export const requireAdminKey = requireStaticKey({
  headerName: "x-predictio-key",
  envName: "ADMIN_API_KEY",
  fallbackEnvName: "BOT_API_KEY",
});

export const requireBotKey = requireStaticKey({
  headerName: "x-predictio-key",
  envName: "BOT_API_KEY",
});

export async function verifyDeveloperApiKeyString(apiKey: string) {
  if (!apiKey.startsWith("pk_") || apiKey.length < 20) return null;

  const keyPrefix = apiKey.slice(0, 12);
  const keySuffix = apiKey.slice(-4);

  const candidates = await prisma.apiKey.findMany({
    where: {
      keyPrefix,
      keySuffix,
      revokedAt: null,
      isActive: true,
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  for (const row of candidates) {
    if (await verifyAPIKeyHash(apiKey, row.keyHash)) {
      await prisma.apiKey.update({
        where: { id: row.id },
        data: { lastUsedAt: new Date() },
      });
      return row;
    }
  }

  return null;
}

export async function requireDeveloperApiKey(req: Request, _res: Response, next: NextFunction) {
  const authHeader = headerString(req, "authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError("Missing or invalid Authorization header", { status: 401, code: "UNAUTHORIZED" }));
  }

  const apiKey = authHeader.slice("Bearer ".length).trim();

  try {
    const row = await verifyDeveloperApiKeyString(apiKey);
    if (!row) return next(new ApiError("Invalid API key", { status: 401, code: "UNAUTHORIZED" }));

    (req as any).apiKey = row;
    (req as any).walletAddress = row.walletAddress;
    return next();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[auth] developer key verification failed", e);
    return next(new ApiError("Authentication failed", { status: 500, code: "AUTH_FAILED" }));
  }
}

function permissionsList(perm: unknown): string[] {
  if (!perm) return [];
  if (Array.isArray(perm)) return perm.map((x) => String(x));
  // tolerate JSON stored as string
  if (typeof perm === "string") {
    try {
      const parsed = JSON.parse(perm);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    } catch {}
  }
  return [];
}

/**
 * Require a specific permission on the authenticated developer api key.
 * Back-compat: if permissions is missing/empty, allow.
 */
export function requireDeveloperPermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const apiKey = (req as any).apiKey as { permissions?: unknown } | undefined;
    if (!apiKey) return next(new ApiError("Unauthorized", { status: 401, code: "UNAUTHORIZED" }));

    const perms = permissionsList(apiKey.permissions);
    if (perms.length === 0) return next(); // back-compat allow
    if (!perms.includes(permission)) {
      return next(new ApiError("Forbidden", { status: 403, code: "FORBIDDEN" }));
    }
    return next();
  };
}

/**
 * If a Bearer api key is present, authenticate and attach walletAddress.
 * If no Authorization header, continue without auth (used for demo/manual callers).
 */
export async function optionalDeveloperApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = headerString(req, "authorization");
  if (!authHeader) return next();
  if (!authHeader.startsWith("Bearer ")) {
    return next(new ApiError("Invalid Authorization header", { status: 401, code: "UNAUTHORIZED" }));
  }
  return requireDeveloperApiKey(req, res, next);
}

/**
 * For write endpoints: optionally authenticate in demo, but can be forced on via env.
 * Set WRITE_AUTH_REQUIRED=1 in production to require Bearer pk_... for writes.
 */
export async function developerApiKeyForWrite(req: Request, res: Response, next: NextFunction) {
  if (process.env.WRITE_AUTH_REQUIRED === "1") {
    return requireDeveloperApiKey(req, res, next);
  }
  return optionalDeveloperApiKey(req, res, next);
}

type ApiKeyRateRecord = { count: number; resetAt: number };
const apiKeyRateLimitMap = new Map<string, ApiKeyRateRecord>();

// Prevent unbounded growth: periodically drop expired buckets
let _pruneTimerStarted = false;
function ensurePruneTimer() {
  if (_pruneTimerStarted) return;
  _pruneTimerStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of apiKeyRateLimitMap.entries()) {
      if (now > v.resetAt) apiKeyRateLimitMap.delete(k);
    }
  }, 60_000).unref?.();
}

function getRateKey(req: Request): string {
  const apiKey = (req as any).apiKey as { id?: string } | undefined;
  if (apiKey?.id) return `key:${apiKey.id}`;
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  return `ip:${ip}`;
}

export function rateLimitByApiKey(opts: { windowMs: number; max: number; code?: string }) {
  const code = opts.code || "RATE_LIMITED";
  return (req: Request, res: Response, next: NextFunction) => {
    ensurePruneTimer();
    const now = Date.now();
    const key = getRateKey(req);
    const rec = apiKeyRateLimitMap.get(key);
    if (!rec || now > rec.resetAt) {
      apiKeyRateLimitMap.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }
    rec.count += 1;
    if (rec.count > opts.max) {
      res.setHeader("retry-after", String(Math.ceil((rec.resetAt - now) / 1000)));
      return next(new ApiError("Rate limit exceeded", { status: 429, code }));
    }
    return next();
  };
}

