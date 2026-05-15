/**
 * Non-secret production-oriented env audit (masks credentials).
 * Usage: node --env-file=.env --import tsx src/scripts/debug/productionEnvAudit.ts
 */
import { normalizeAzuroGraphqlUrl } from "../../services/azuroCuratorGraphql";
import { writeDebugJson } from "./debugOut";

function maskUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}${u.pathname.slice(0, 80)}`;
  } catch {
    return raw.slice(0, 60) + (raw.length > 60 ? "…" : "");
  }
}

function main() {
  const azuro = process.env.AZURO_DATA_FEED_URL ?? "";
  const rows = {
    NODE_ENV: process.env.NODE_ENV ?? null,
    PREDICTIO_EMERGENCY_RELAX: process.env.PREDICTIO_EMERGENCY_RELAX ?? null,
    AZURO_DATA_FEED_URL_set: Boolean(azuro),
    AZURO_DATA_FEED_URL_normalized: azuro ? maskUrl(normalizeAzuroGraphqlUrl(azuro)) : null,
    PORT: process.env.PORT ?? null,
    DATABASE_URL_set: Boolean(process.env.DATABASE_URL),
    REDIS_URL_set: Boolean(process.env.REDIS_URL),
    PREDICTION_MARKET_ADDRESS_set: Boolean(process.env.PREDICTION_MARKET_ADDRESS),
    PUBLIC_API_BASE: process.env.PUBLIC_API_BASE ?? process.env.VITE_API_URL ?? null,
  };

  const dest = writeDebugJson("production-env-audit.json", rows);
  console.log(JSON.stringify(rows, null, 2));
  console.log("Wrote:", dest);
}

main();
