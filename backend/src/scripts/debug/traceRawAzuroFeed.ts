/**
 * One-shot RAW_FEED forensic trace (indexer + pipeline).
 * Usage (from backend/):
 *   PREDICTIO_RAW_FEED_MODE=true node --env-file=.env --import tsx src/scripts/debug/traceRawAzuroFeed.ts
 */
import { buildEuropeanCurationGamesPayload } from "../../services/eventCurationPipeline";

async function main() {
  if (String(process.env.PREDICTIO_RAW_FEED_MODE ?? "").trim() === "") {
    process.env.PREDICTIO_RAW_FEED_MODE = "true";
    console.warn("[traceRawAzuroFeed] PREDICTIO_RAW_FEED_MODE forced to true for this run");
  }

  const selected = new Set<string>();
  const { games, diagnostics } = await buildEuropeanCurationGamesPayload(selected);
  const inv = diagnostics.emergencyInventory as Record<string, unknown> | undefined;

  console.log("\n=== RAW FEED TRACE SUMMARY ===");
  console.log("RAW_FEED_COUNT:", diagnostics.totalFromAzuro);
  console.log("NORMALIZED_COUNT:", inv?.NORMALIZED_COUNT ?? "n/a");
  console.log("VALID_COUNT:", inv?.VALID_COUNT ?? "n/a");
  console.log("RENDERED/API:", games.length);
  console.log("See logs above for REJECTED_EVENT, TOP_30_*, RAW_FEED_FORENSIC_CONCLUSION");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
