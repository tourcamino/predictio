/**
 * Standalone DB connectivity check (read-only).
 *
 * Intended: npx ts-node --project tsconfig.json test-db.ts
 * In this repo that fails: package.json has "type":"module", so Node ESM cannot resolve
 * extensionless imports inside src/server/db.ts (e.g. ./env). Use tsx instead:
 *   node --import tsx test-db.ts
 * On Windows behind SSL inspection, prefix: set NODE_OPTIONS=--use-system-ca
 */
import { db as prisma } from "./src/server/db";

function redactDatabaseUrl(raw: string | undefined): string {
  if (raw === undefined) return "(undefined)";
  if (raw === "") return "(empty string)";
  // postgresql://user:secret@host -> postgresql://user:***@host
  return raw.replace(/(:\/\/[^:]+:)([^@/]+)(@)/, "$1***$3");
}

async function main(): Promise<void> {
  console.log("DATABASE_URL (password redacted):", redactDatabaseUrl(process.env.DATABASE_URL));

  try {
    const rows = await prisma.user.findMany({ take: 1 });
    console.log("findMany result:", JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error("Query failed:");
    console.error(err);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
