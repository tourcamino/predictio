/**
 * Forensic homepage pipeline — live API → map → football-first → LiveMarket cards.
 * Run: npx tsx scripts/debug-homepage-pipeline.ts
 */
import {
  curatedApiRowToAzuroMarket,
  type CuratedMarketApiRow,
} from "../src/utils/curatedMarketsApi";
import { buildFootballFirstHomepageView } from "../src/lib/footballFirstView";
import { filterValidAzuroMarketsForView } from "../src/lib/marketViewSafety";
import { seedMarketToLiveMarket } from "../src/utils/seedMarketToLiveMarket";
import { getMarketStatus } from "../src/utils/marketLifecycle";

const API = "https://api.predictio.live/api/markets";

type Step = {
  name: string;
  ok: boolean;
  error?: string;
};

async function main(): Promise<void> {
  const steps: Step[] = [];
  let rows: CuratedMarketApiRow[] = [];
  let mapped = filterValidAzuroMarketsForView([], "debug");
  let view = mapped;
  let cards: ReturnType<typeof seedMarketToLiveMarket>[] = [];

  try {
    const res = await fetch(API, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      markets?: CuratedMarketApiRow[];
      protocolRegistryMode?: boolean;
      rawFeedMode?: boolean;
    };
    rows = data.markets ?? [];
    steps.push({
      name: "fetch_api",
      ok: true,
    });
    console.log(
      JSON.stringify({
        tag: "HOME_DEBUG_FETCH",
        count: rows.length,
        protocolRegistryMode: data.protocolRegistryMode,
        rawFeedMode: data.rawFeedMode,
      }),
    );
  } catch (e) {
    steps.push({
      name: "fetch_api",
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
    report(steps);
    process.exit(1);
  }

  try {
    mapped = filterValidAzuroMarketsForView(
      rows.map(curatedApiRowToAzuroMarket),
      "debug-homepage-pipeline",
    );
    steps.push({ name: "map_and_validate", ok: true });
  } catch (e) {
    steps.push({
      name: "map_and_validate",
      ok: false,
      error: e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e),
    });
    report(steps);
    process.exit(1);
  }

  const broken = rows
    .map((row, i) => ({ row, azuro: mapped[i] }))
    .filter(({ azuro }) => !azuro)
    .map(({ row }) => row.gameId);
  if (broken.length) {
    console.log(
      JSON.stringify({
        tag: "HOME_DEBUG_DROPPED_ROWS",
        count: broken.length,
        gameIds: broken.slice(0, 20),
      }),
    );
  }

  try {
    view = buildFootballFirstHomepageView(mapped, 9, 9);
    steps.push({ name: "football_first_view", ok: true });
  } catch (e) {
    steps.push({
      name: "football_first_view",
      ok: false,
      error: e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e),
    });
    report(steps);
    process.exit(1);
  }

  try {
    cards = view.map((m) => {
      const live = seedMarketToLiveMarket(m);
      getMarketStatus(live);
      return live;
    });
    steps.push({ name: "seed_to_live_and_lifecycle", ok: true });
  } catch (e) {
    steps.push({
      name: "seed_to_live_and_lifecycle",
      ok: false,
      error: e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e),
    });
    report(steps);
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      tag: "HOME_DEBUG_OK",
      apiCount: rows.length,
      mappedCount: mapped.length,
      viewCount: view.length,
      cardCount: cards.length,
      footballInView: view.filter((m) => m.sport === "football" || m.sport === "soccer")
        .length,
    }),
  );
  report(steps);
}

function report(steps: Step[]): void {
  console.log(JSON.stringify({ tag: "HOME_DEBUG_STEPS", steps }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
