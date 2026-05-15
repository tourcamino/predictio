/**
 * Temporal window density — events available by lookahead window.
 * Usage: node --env-file=.env --import tsx src/scripts/debug/temporalWindowDensity.ts
 */
import { fetchAzuroGames, rawGameIsFootball } from "../../services/azuroCuratorGraphql";
import { kickoffSecFromRaw } from "../../services/eventCurationPipeline";
import { emergencyFetchNowSkewSec } from "../../services/emergencyRelaxMode";
import { writeDebugJson } from "./debugOut";

const HOUR = 3600;

async function main() {
  const wallSec = Math.floor(Date.now() / 1000);
  const nowSec = wallSec - emergencyFetchNowSkewSec();
  const raw = await fetchAzuroGames({ minStartsAtSec: nowSec });

  const windowsH = [6, 12, 24, 48, 72, 24 * 7];
  const byWindow: Record<string, { allSports: number; football: number }> = {};

  for (const h of windowsH) {
    const end = nowSec + h * HOUR;
    let allN = 0;
    let fbN = 0;
    for (const g of raw) {
      const k = kickoffSecFromRaw(g);
      if (k == null || k <= nowSec || k >= end) continue;
      allN += 1;
      if (rawGameIsFootball(g)) fbN += 1;
    }
    byWindow[`next_${h}h`] = { allSports: allN, football: fbN };
  }

  const out = { generatedAtIso: new Date().toISOString(), nowSec, wallSec, eventsAvailableByWindow: byWindow };
  const dest = writeDebugJson("temporal-window-density.json", out);
  console.log("Wrote:", dest);
  console.log(JSON.stringify(byWindow, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
