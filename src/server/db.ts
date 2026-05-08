import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

import { env } from "./env";

const ALLOWED_LEVELS = new Set<Prisma.LogLevel>([
  "query",
  "info",
  "warn",
  "error",
]);

function prismaLogLevels(): Prisma.LogLevel[] | Prisma.LogDefinition[] {
  const raw = env.PRISMA_LOG?.trim().toLowerCase();
  if (raw === "silent" || raw === "none" || raw === "off") {
    return [];
  }
  if (raw === "verbose" || raw === "all") {
    return ["query", "warn", "error"];
  }
  if (raw && raw.length > 0) {
    const levels = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is Prisma.LogLevel => ALLOWED_LEVELS.has(s as Prisma.LogLevel));
    if (levels.length > 0) return levels;
  }
  // Dev default: no query stream; keeps terminal readable when DATABASE_URL points at a down host.
  return env.NODE_ENV === "development" ? ["warn"] : ["error"];
}

const createPrismaClient = () =>
  new PrismaClient({
    log: prismaLogLevels(),
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
