/**
 * One-shot tick for VPS cron, e.g. every 10–15 minutes:
 *   AUTONOMOUS_COPY_ANALYSTS_ENABLED=true DATABASE_URL=... npx tsx src/server/scripts/runAutonomousCopyAnalystTick.ts
 */
import { runAutonomousCopyAnalystTick } from "~/server/services/autonomousCopyAnalystTrader";

runAutonomousCopyAnalystTick()
  .then((r) => {
    console.log(JSON.stringify({ ok: true, ...r }));
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
