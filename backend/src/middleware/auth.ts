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

export async function requireDeveloperApiKey(req: Request, _res: Response, next: NextFunction) {
  const authHeader = headerString(req, "authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError("Missing or invalid Authorization header", { status: 401, code: "UNAUTHORIZED" }));
  }

  const apiKey = authHeader.slice("Bearer ".length).trim();
  if (!apiKey.startsWith("pk_") || apiKey.length < 20) {
    return next(new ApiError("Invalid API key", { status: 401, code: "UNAUTHORIZED" }));
  }

  const keyPrefix = apiKey.slice(0, 12);
  const keySuffix = apiKey.slice(-4);

  try {
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

        (req as any).apiKey = row;
        (req as any).walletAddress = row.walletAddress;
        return next();
      }
    }

    return next(new ApiError("Invalid API key", { status: 401, code: "UNAUTHORIZED" }));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[auth] developer key verification failed", e);
    return next(new ApiError("Authentication failed", { status: 500, code: "AUTH_FAILED" }));
  }
}

