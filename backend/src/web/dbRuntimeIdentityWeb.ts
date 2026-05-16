import type { PrismaClient } from "@prisma/client";
import { getDatabaseUrlIdentity } from "../lib/databaseUrlIdentity";

export async function runDbRuntimeIdentityWeb(prisma: PrismaClient) {
  const databaseUrl = getDatabaseUrlIdentity();
  let postgres: { currentDatabase: string; currentSchema: string } | null = null;
  try {
    const rows = await prisma.$queryRaw<
      Array<{ current_database: string; current_schema: string }>
    >`SELECT current_database() AS current_database, current_schema() AS current_schema`;
    const row = rows[0];
    if (row) {
      postgres = {
        currentDatabase: row.current_database,
        currentSchema: row.current_schema,
      };
    }
  } catch (e) {
    postgres = null;
  }

  const [orderCount, userCount, transactionCount] = await Promise.all([
    prisma.order.count(),
    prisma.user.count(),
    prisma.transaction.count(),
  ]);

  return {
    runtime: "express-vps" as const,
    databaseUrl,
    postgres,
    tableCounts: { order: orderCount, user: userCount, transaction: transactionCount },
    at: new Date().toISOString(),
  };
}
