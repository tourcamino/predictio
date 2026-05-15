/**
 * Local catalog depth + pagination probe.
 * Usage: node --env-file=.env --import tsx src/scripts/runCatalogDebug.ts
 */
import { PrismaClient } from "@prisma/client";
import { collectCatalogDepthDiagnostics } from "../services/catalogDepthDiagnostics";

const prisma = new PrismaClient();

async function main() {
  const report = await collectCatalogDepthDiagnostics(prisma);
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
