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

