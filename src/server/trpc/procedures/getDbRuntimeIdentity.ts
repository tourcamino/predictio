import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { getDatabaseUrlIdentity } from "~/lib/databaseUrlIdentity";

/** Public read-only DB fingerprint — compare with Express `/api/v1/web/db-runtime-identity`. */
export const getDbRuntimeIdentity = baseProcedure.query(async () => {
  const databaseUrl = getDatabaseUrlIdentity();
  let postgres: { currentDatabase: string; currentSchema: string } | null = null;
  try {
    const rows = await db.$queryRaw<
      Array<{ current_database: string; current_schema: string }>
    >`SELECT current_database() AS current_database, current_schema() AS current_schema`;
    const row = rows[0];
    if (row) {
      postgres = {
        currentDatabase: row.current_database,
        currentSchema: row.current_schema,
      };
    }
  } catch {
    postgres = null;
  }

  const [orderCount, userCount, transactionCount] = await Promise.all([
    db.order.count(),
    db.user.count(),
    db.transaction.count(),
  ]);

  return {
    runtime: "vercel-trpc" as const,
    databaseUrl,
    postgres,
    tableCounts: { order: orderCount, user: userCount, transaction: transactionCount },
    at: new Date().toISOString(),
  };
});
