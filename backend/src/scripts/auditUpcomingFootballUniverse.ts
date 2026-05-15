/**
 * Hard audit: raw Azuro football universe vs pipeline losses (no gate expansion).
 * Usage: node --env-file=.env --import tsx src/scripts/auditUpcomingFootballUniverse.ts
 */
import { normalizeAzuroGraphqlUrl, fetchAzuroGames, rawGameIsFootball, type RawAzuroGame } from "../services/azuroCuratorGraphql";
import {
  explainAllowedLeagueRejection,
  filterEuropeanUpcoming,
  isStalePrematchGame,
  kickoffSecFromRaw,
} from "../services/eventCurationPipeline";

const LOOKAHEAD_SEC_60D = 60 * 24 * 60 * 60;
const TOP_ROWS = 200;
const GATE_SAMPLE = 50;

const WHITELISTED_TOP_TIERS = [
  "Premier League",
  "Serie A",
  "La Liga",
  "Bundesliga",
  "Ligue 1",
  "Eredivisie",
  "Primeira Liga",
  "Champions League",
  "Europa League",
  "Conference League",
  "Coppa Italia",
] as const;

const USER_ASKED_LEAGUES = [
  "Premier League",
  "Serie A",
  "Serie B",
  "Bundesliga",
  "Eredivisie",
  "Primeira Liga",
  "Belgian Pro League",
  "Turkish Super Lig",
  "Super Lig",
  "Danish Superliga",
  "Austrian Bundesliga",
  "Swiss Super League",
  "La Liga",
  "Ligue 1",
] as const;

function sortParticipants(parts: RawAzuroGame["participants"]) {
  const arr = Array.isArray(parts) ? parts : [];
  return [...arr].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
}

function rowFromGame(g: RawAzuroGame) {
  const sorted = sortParticipants(g.participants);
  const kickoff = kickoffSecFromRaw(g);
  return {
    league: g.league?.name ?? "",
    leagueSlug: g.league?.slug ?? "",
    country: g.league?.country?.name ?? "",
    startsAt: kickoff != null ? new Date(kickoff * 1000).toISOString() : String(g.startsAt ?? ""),
    status: String(g.state ?? ""),
    home: sorted[0]?.name ?? "",
    away: sorted[1]?.name ?? "",
    gameId: String(g.gameId ?? g.id ?? "").trim(),
  };
}

function inc(map: Record<string, number>, key: string) {
  const k = key.trim() || "(empty)";
  map[k] = (map[k] ?? 0) + 1;
}

function detectNetworkFromEndpoint(endpoint: string): string {
  const e = endpoint.toLowerCase();
  if (e.includes("polygon")) return "polygon";
  if (e.includes("gnosis")) return "gnosis";
  if (e.includes("chiliz")) return "chiliz";
  if (e.includes("sepolia") || e.includes("test")) return "testnet";
  return "unknown";
}

async function probeGraphqlStartsAtGte(endpoint: string, nowSec: number): Promise<boolean> {
  const query = `
    query Probe($first: Int!, $minStartsAt: BigInt!) {
      games(
        first: $first
        where: { state: Prematch, activeConditionsCount_gt: 0, startsAt_gte: $minStartsAt }
        orderBy: startsAt
        orderDirection: asc
      ) {
        gameId
        startsAt
      }
    }
  `;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { first: 1, minStartsAt: String(nowSec) },
      }),
    });
    const json = (await response.json()) as { data?: unknown; errors?: unknown };
    return response.ok && !json.errors && json.data != null;
  } catch {
    return false;
  }
}

function classifyFootball(
  games: RawAzuroGame[],
  nowSec: number,
  windowEndSec: number,
): {
  allFootball: RawAzuroGame[];
  stalePrematch: RawAzuroGame[];
  futureValid: RawAzuroGame[];
  futureIn60d: RawAzuroGame[];
  lockedPast: RawAzuroGame[];
  noCountry: RawAzuroGame[];
  noLeagueSlug: RawAzuroGame[];
} {
  const allFootball = games.filter((g) => rawGameIsFootball(g));
  const stalePrematch: RawAzuroGame[] = [];
  const futureValid: RawAzuroGame[] = [];
  const futureIn60d: RawAzuroGame[] = [];
  const lockedPast: RawAzuroGame[] = [];
  const noCountry: RawAzuroGame[] = [];
  const noLeagueSlug: RawAzuroGame[] = [];

  for (const g of allFootball) {
    if (!(g.league?.country?.name ?? "").trim()) noCountry.push(g);
    if (!(g.league?.slug ?? "").trim()) noLeagueSlug.push(g);

    if (isStalePrematchGame(g, nowSec)) {
      stalePrematch.push(g);
      const kickoff = kickoffSecFromRaw(g);
      if (kickoff != null && kickoff <= nowSec) lockedPast.push(g);
      continue;
    }

    const kickoff = kickoffSecFromRaw(g);
    if (kickoff == null || kickoff <= nowSec) {
      lockedPast.push(g);
      continue;
    }

    futureValid.push(g);
    if (kickoff < windowEndSec) futureIn60d.push(g);
  }

  futureValid.sort((a, b) => (kickoffSecFromRaw(a) ?? 0) - (kickoffSecFromRaw(b) ?? 0));
  futureIn60d.sort((a, b) => (kickoffSecFromRaw(a) ?? 0) - (kickoffSecFromRaw(b) ?? 0));

  return {
    allFootball,
    stalePrematch,
    futureValid,
    futureIn60d,
    lockedPast,
    noCountry,
    noLeagueSlug,
  };
}

function leagueCounts(games: RawAzuroGame[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const g of games) {
    const key = `${g.league?.name ?? "?"} | ${g.league?.country?.name ?? "?"}`;
    inc(map, key);
  }
  return Object.fromEntries(
    Object.entries(map).sort((a, b) => b[1] - a[1]),
  );
}

function countLeagueNameContains(games: RawAzuroGame[], needle: string): number {
  const n = needle.toLowerCase();
  return games.filter((g) => (g.league?.name ?? "").toLowerCase().includes(n)).length;
}

async function main() {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowEndSec = nowSec + LOOKAHEAD_SEC_60D;

  const dataFeed = (process.env.AZURO_DATA_FEED_URL ?? "").trim();
  const legacyRaw = (process.env.AZURO_GRAPHQL_URL ?? "").trim();
  const apiUrl = (process.env.AZURO_API_URL ?? "").trim();
  const endpoint = dataFeed || (legacyRaw ? normalizeAzuroGraphqlUrl(legacyRaw) : "");

  if (!endpoint) {
    console.error("AZURO_DATA_FEED_URL / AZURO_GRAPHQL_URL not set");
    process.exitCode = 1;
    return;
  }

  const graphqlStartsAtGte = await probeGraphqlStartsAtGte(endpoint, nowSec);

  console.log(
    JSON.stringify({
      tag: "azuro_source",
      endpoint,
      network: detectNetworkFromEndpoint(endpoint),
      azuroDataFeedUrl: dataFeed || null,
      azuroApiUrl: apiUrl || null,
      azuroGraphqlUrlLegacy: legacyRaw || null,
      graphqlStartsAtGte,
      nodeEnv: process.env.NODE_ENV ?? null,
      auditAt: new Date().toISOString(),
    }),
  );

  console.log("\n==> Fetching WITHOUT startsAt_gte (full Prematch pages)...");
  const rawPlain = await fetchAzuroGames();

  console.log("\n==> Fetching WITH startsAt_gte (production-style)...");
  const rawGte = await fetchAzuroGames({ minStartsAtSec: nowSec });

  const plain = classifyFootball(rawPlain, nowSec, windowEndSec);
  const gte = classifyFootball(rawGte, nowSec, windowEndSec);
  const pipelinePlain = filterEuropeanUpcoming(rawPlain, nowSec, windowEndSec);
  const pipelineGte = filterEuropeanUpcoming(rawGte, nowSec, windowEndSec);

  console.log(
    JSON.stringify({
      tag: "audit_fetch_compare",
      rawPlain: rawPlain.length,
      rawGte: rawGte.length,
      plainFootball: plain.allFootball.length,
      gteFootball: gte.allFootball.length,
      plainStalePrematch: plain.stalePrematch.length,
      plainFutureValid: plain.futureValid.length,
      plainFutureIn60d: plain.futureIn60d.length,
      gteFutureValid: gte.futureValid.length,
      gteFutureIn60d: gte.futureIn60d.length,
      pipelineGte_futureWhitelisted: pipelineGte.futureWhitelisted,
      pipelineGte_futureItalianPool: pipelineGte.futureItalianPool,
    }),
  );

  console.log(
    JSON.stringify({
      tag: "audit_league_distribution_plain",
      bucket: "future_valid_all_horizons",
      counts: leagueCounts(plain.futureValid),
    }),
  );

  console.log(
    JSON.stringify({
      tag: "audit_league_distribution_gte",
      bucket: "future_valid_all_horizons",
      counts: leagueCounts(gte.futureValid),
    }),
  );

  console.log(
    JSON.stringify({
      tag: "audit_league_distribution_gte",
      bucket: "future_in_60d",
      counts: leagueCounts(gte.futureIn60d),
    }),
  );

  console.log(
    JSON.stringify({
      tag: "audit_league_distribution_plain",
      bucket: "stale_prematch",
      counts: leagueCounts(plain.stalePrematch),
    }),
  );

  const topTierInGte60 = Object.fromEntries(
    WHITELISTED_TOP_TIERS.map((name) => [name, countLeagueNameContains(gte.futureIn60d, name)]),
  );
  const userAskedInGte60 = Object.fromEntries(
    USER_ASKED_LEAGUES.map((name) => [name, countLeagueNameContains(gte.futureIn60d, name)]),
  );

  console.log(
    JSON.stringify({
      tag: "audit_top_tier_presence_gte_60d",
      whitelistedTopTiers: topTierInGte60,
      userAskedLeagues: userAskedInGte60,
    }),
  );

  console.log(`\n==> Top ${TOP_ROWS} football FUTURE rows (gte feed, no gate, startsAt asc):\n`);
  const topRows = gte.futureIn60d.slice(0, TOP_ROWS);
  for (const g of topRows) {
    console.log(JSON.stringify(rowFromGame(g)));
  }

  const gateSample = gte.futureIn60d.slice(0, GATE_SAMPLE);
  const gateDump = gateSample.map((g) => {
    const league = g.league?.name ?? "";
    const country = g.league?.country?.name ?? "";
    const slug = g.league?.slug ?? "";
    const verdict = explainAllowedLeagueRejection(league, country, slug);
    return {
      league,
      slug,
      country,
      passesGate: verdict.passesLeagueGate,
      reason: verdict.rejectionReason,
      startsAt: rowFromGame(g).startsAt,
      home: rowFromGame(g).home,
      away: rowFromGame(g).away,
    };
  });

  console.log(
    JSON.stringify({
      tag: "audit_whitelist_gate_sample",
      sampleSize: gateDump.length,
      passCount: gateDump.filter((r) => r.passesGate).length,
      rows: gateDump,
    }),
  );

  const gatePassIn60 = gte.futureIn60d.filter((g) =>
    explainAllowedLeagueRejection(
      g.league?.name ?? "",
      g.league?.country?.name ?? "",
      g.league?.slug,
    ).passesLeagueGate,
  );

  console.log(
    JSON.stringify({
      tag: "audit_whitelist_gate_totals_gte_60d",
      futureIn60d: gte.futureIn60d.length,
      passesEuropeanGate: gatePassIn60.length,
      gatePassLeagues: leagueCounts(gatePassIn60),
    }),
  );

  console.log(
    JSON.stringify({
      tag: "audit_investigation_answers",
      q1_topLeaguesExistInFutureFeed: topTierInGte60,
      q2_stalePrematchVolume_plainFetch: {
        stale: plain.stalePrematch.length,
        football: plain.allFootball.length,
        pctStale: plain.allFootball.length
          ? Math.round((plain.stalePrematch.length / plain.allFootball.length) * 100)
          : 0,
      },
      q3_lostInFiltering_gte60d: {
        footballAfterGte: gte.allFootball.length,
        futureIn60d: gte.futureIn60d.length,
        passesGate: gatePassIn60.length,
        pipelineFutureWhitelisted: pipelineGte.futureWhitelisted,
      },
      q4_graphqlEndpoint: endpoint,
      q5_dbLegacy: "run_phase4_on_vps",
      q6_refillReactivates: "see marketStatusUpdater upsert — only pipeline candidates; Serie B cannot pass gate today",
      q7_serieBOpen: "if OPEN in DB, legacy row — gate now rejects serie b; not from current pipeline pick",
      note_intentionallyExcludedFromWhitelist: [
        "Belgian Pro League",
        "Turkish Super Lig",
        "Danish Superliga",
        "Austrian Bundesliga",
        "Swiss Super League",
        "most Scandinavian domestic",
      ],
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
