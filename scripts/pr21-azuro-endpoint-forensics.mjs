#!/usr/bin/env node
/**
 * PR21 — Azuro endpoint forensics: compare all known endpoints + REST API + oracle states.
 * Usage: node scripts/pr21-azuro-endpoint-forensics.mjs [--save-samples]
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const SAVE = process.argv.includes("--save-samples");
const NOW_SEC = Math.floor(Date.now() / 1000);
const H24 = NOW_SEC + 24 * 3600;
const H72 = NOW_SEC + 72 * 3600;

const ENDPOINTS = {
  /** Predictio production default */
  dataFeedPolygon1: "https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon",
  dataFeedPolygon: "https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon",
  dataFeedGnosis: "https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-gnosis",
  /** Client subgraphs (bet history — NOT feed per Azuro docs) */
  apiPolygonV3: "https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3",
  apiGnosisV3: "https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-api-gnosis-v3",
  /** Legacy hosted service (from .env.example) */
  legacyGnosisHosted: "https://thegraph.com/hosted-service/subgraph/azuro-protocol/azuro-api-gnosis",
};

const LEAGUE_PATTERNS = {
  premier: /premier league|english premier/i,
  ucl: /champions league|uefa champions/i,
  serieA: /serie a/i,
  laliga: /la liga|laliga/i,
  bundesliga: /bundesliga/i,
  worldCup: /world cup|fifa/i,
};

const GAMES_FIELDS = `
  gameId title startsAt state activeConditionsCount
  sport { name slug }
  league { name slug country { name } }
  participants { name sortOrder }
  conditions(where: { state: Active }, first: 3) {
    conditionId state wonOutcomeIds
    outcomes { outcomeId currentOdds }
  }
`;

async function gql(url, query, variables = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, status: res.status, error: "non_json", body: text.slice(0, 200) };
    }
    if (json.errors?.length) {
      return { ok: false, status: res.status, errors: json.errors, data: json.data };
    }
    return { ok: true, status: res.status, data: json.data };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

function isFootball(g) {
  const slug = (g.sport?.slug || "").toLowerCase();
  const name = (g.sport?.name || "").toLowerCase();
  return slug === "football" || slug === "soccer" || name.includes("football");
}

function classifyLeague(name) {
  for (const [k, re] of Object.entries(LEAGUE_PATTERNS)) {
    if (re.test(name || "")) return k;
  }
  return "other";
}

function summarizeGames(games, label) {
  const football = games.filter(isFootball);
  const in24 = games.filter((g) => +g.startsAt >= NOW_SEC && +g.startsAt <= H24);
  const in72 = games.filter((g) => +g.startsAt >= NOW_SEC && +g.startsAt <= H72);
  const pastKickoff = games.filter((g) => +g.startsAt <= NOW_SEC);
  const patternCounts = {};
  for (const g of games) {
    const k = classifyLeague(g.league?.name);
    patternCounts[k] = (patternCounts[k] || 0) + 1;
  }
  const states = {};
  for (const g of games) {
    const s = g.state || "unknown";
    states[s] = (states[s] || 0) + 1;
  }
  return {
    label,
    total: games.length,
    football: football.length,
    next24h: in24.length,
    next72h: in72.length,
    pastKickoffPrematch: pastKickoff.length,
    patternCounts,
    stateDistribution: states,
    nearest72hFootball: football
      .filter((g) => +g.startsAt >= NOW_SEC && +g.startsAt <= H72)
      .slice(0, 8)
      .map((g) => ({
        gameId: g.gameId,
        title: g.title,
        league: g.league?.name,
        startsAt: new Date(+g.startsAt * 1000).toISOString(),
        state: g.state,
      })),
  };
}

async function fetchAllPrematch(url, useGte, maxPages = 8) {
  const all = [];
  const pageSize = 250;
  for (let page = 0; page < maxPages; page++) {
    const skip = page * pageSize;
    let result;
    if (useGte) {
      result = await gql(
        url,
        `query($first:Int!,$skip:Int!,$min:BigInt!){
          games(first:$first,skip:$skip,where:{state:Prematch,activeConditionsCount_gt:0,startsAt_gte:$min},orderBy:startsAt,orderDirection:asc){
            ${GAMES_FIELDS}
          }}`,
        { first: pageSize, skip, min: String(NOW_SEC) },
      );
    } else {
      result = await gql(
        url,
        `query($first:Int!,$skip:Int!){
          games(first:$first,skip:$skip,where:{state:Prematch,activeConditionsCount_gt:0},orderBy:startsAt,orderDirection:asc){
            ${GAMES_FIELDS}
          }}`,
        { first: pageSize, skip },
      );
    }
    if (!result.ok) return { error: result, games: all };
    const batch = result.data?.games || [];
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return { games: all };
}

async function fetchLive(url) {
  const result = await gql(
    url,
    `query($first:Int!){
      games(first:$first,where:{state:Live,activeConditionsCount_gt:0},orderBy:startsAt,orderDirection:desc){
        ${GAMES_FIELDS}
      }}`,
    { first: 100 },
  );
  if (!result.ok) return { error: result, games: [] };
  return { games: result.data?.games || [] };
}

async function fetchMeta(url) {
  return gql(url, `{ _meta { block { number timestamp } deployment hasIndexingErrors } }`);
}

async function probeEndpoint(name, url) {
  const meta = await fetchMeta(url);
  const [allPrematch, gtePrematch, live] = await Promise.all([
    fetchAllPrematch(url, false),
    fetchAllPrematch(url, true),
    fetchLive(url),
  ]);

  return {
    name,
    url,
    meta: meta.ok
      ? {
          block: meta.data?._meta?.block?.number,
          timestamp: meta.data?._meta?.block?.timestamp,
          deployment: meta.data?._meta?.deployment,
          hasIndexingErrors: meta.data?._meta?.hasIndexingErrors,
        }
      : { error: meta.error || meta.errors },
    prematchAll: summarizeGames(allPrematch.games || [], "prematch_all"),
    prematchGte: summarizeGames(gtePrematch.games || [], "prematch_gte_now"),
    live: summarizeGames(live.games || [], "live_state"),
    errors: {
      prematchAll: allPrematch.error ? String(allPrematch.error.errors || allPrematch.error.error).slice(0, 200) : null,
      live: live.error ? String(live.error.errors || live.error.error).slice(0, 200) : null,
    },
  };
}

async function probeRestMarketManager() {
  const base = "https://api.onchainfeed.org/api/v1/public/market-manager";
  const attempts = [];
  const NOW = NOW_SEC;

  const configs = [
    {
      label: "prematch_all",
      params: {
        environment: "PolygonUSDT",
        gameState: "Prematch",
        page: "1",
        perPage: "100",
        orderBy: "startsAt",
        orderDirection: "asc",
      },
    },
    {
      label: "football_prematch",
      params: {
        environment: "PolygonUSDT",
        gameState: "Prematch",
        page: "1",
        perPage: "100",
        sportSlug: "football",
        orderBy: "startsAt",
        orderDirection: "asc",
      },
    },
    {
      label: "live",
      params: {
        environment: "PolygonUSDT",
        gameState: "Live",
        page: "1",
        perPage: "100",
        orderBy: "startsAt",
        orderDirection: "desc",
      },
    },
  ];

  for (const { label, params } of configs) {
    try {
      const q = new URLSearchParams(params);
      const res = await fetch(`${base}/games-by-filters?${q}`);
      const j = await res.json();
      const games = j.games || [];
      attempts.push({
        label,
        url: `${base}/games-by-filters?${q}`,
        status: res.status,
        total: j.total,
        summary: summarizeGames(
          games.map((g) => ({
            gameId: g.gameId,
            title: g.title,
            startsAt: g.startsAt,
            state: g.state,
            sport: g.sport,
            league: { name: g.league?.name, country: g.country },
            participants: g.participants,
          })),
          label,
        ),
        eplToday: games
          .filter(
            (g) =>
              g.sport?.slug === "football" &&
              g.country?.name === "England" &&
              g.league?.name === "Premier League" &&
              +g.startsAt >= NOW &&
              +g.startsAt <= H72,
          )
          .slice(0, 5)
          .map((g) => ({ title: g.title, gameId: g.gameId, startsAt: g.startsAt })),
      });
    } catch (e) {
      attempts.push({ label, error: e.message });
    }
  }

  return attempts;
}

async function probeOracleStates(url, gameIds) {
  if (!gameIds.length) return [];
  const result = await gql(
    url,
    `query($ids:[String!]!){
      games(where:{gameId_in:$ids}){
        gameId title state startsAt
        conditions { conditionId state wonOutcomeIds outcomes { outcomeId } }
      }}`,
    { ids: gameIds },
  );
  if (!result.ok) return [{ error: result.errors || result.error }];
  return (result.data?.games || []).map((g) => ({
    gameId: g.gameId,
    title: g.title,
    state: g.state,
    kickoff: new Date(+g.startsAt * 1000).toISOString(),
    kickoffPast: +g.startsAt <= NOW_SEC,
    conditions: (g.conditions || []).slice(0, 3).map((c) => ({
      conditionId: c.conditionId,
      state: c.state,
      wonOutcomeIds: c.wonOutcomeIds,
      outcomeCount: c.outcomes?.length ?? 0,
    })),
  }));
}

async function fetchPredictioApi() {
  const API = (process.env.PREDICTIO_API_BASE || "https://api.predictio.live").replace(/\/$/, "");
  const paths = ["/api/v1/version", "/api/markets?limit=5"];
  const out = {};
  for (const p of paths) {
    try {
      const res = await fetch(`${API}${p}`);
      out[p] = await res.json();
    } catch (e) {
      out[p] = { error: e.message };
    }
  }
  return { api: API, ...out };
}

async function main() {
  console.error("[pr21] probing endpoints…");
  const endpointResults = [];
  for (const [name, url] of Object.entries(ENDPOINTS)) {
    console.error(`  → ${name}`);
    endpointResults.push(await probeEndpoint(name, url));
  }

  const restResults = await probeRestMarketManager();

  // Oracle probe: wallet positions from PR16/18
  const oracleGameIds = [
    "1006000000000077352066",
    "1006000000000081204714",
    "1006000000000081204716",
    "1006000000000083636688",
  ];
  const primaryUrl = ENDPOINTS.dataFeedPolygon1;
  const oracleProbe = await probeOracleStates(primaryUrl, oracleGameIds);

  const predictio = await fetchPredictioApi();

  const prodEndpoint = endpointResults.find((e) => e.name === "dataFeedPolygon1");
  const restPrematch = restResults.find((r) => r.label === "football_prematch");
  const restFootball72 =
    restPrematch?.summary?.next72h ?? restPrematch?.summary?.next24h ?? 0;
  const subgraphFootball72 = prodEndpoint?.prematchGte?.next72h ?? 0;

  let rootCause = "UNKNOWN";
  const notes = [];
  notes.push("Azuro official docs (Mar 2026): data-feed subgraphs DEPRECATED — use Backend REST API (market-manager)");
  if (prodEndpoint?.prematchAll?.pastKickoffPrematch > 100) {
    notes.push(`Subgraph stale prematch zombies: ${prodEndpoint.prematchAll.pastKickoffPrematch}`);
  }
  if (prodEndpoint?.meta?.timestamp && prodEndpoint.meta.timestamp < NOW_SEC - 86400) {
    notes.push(`Subgraph indexer lag ~${Math.round((NOW_SEC - prodEndpoint.meta.timestamp) / 86400)}d`);
  }

  if (restFootball72 > 0 && subgraphFootball72 === 0) {
    rootCause =
      "QUERY_STRATEGY_OBSOLETE — deprecated data-feed subgraph stale/missing games; official REST API has near-term football inventory";
    notes.push(
      `REST football next72h=${restFootball72} vs subgraph gte next72h=${subgraphFootball72}`,
    );
    if (restPrematch?.eplToday?.length) {
      notes.push(`REST EPL today: ${JSON.stringify(restPrematch.eplToday)}`);
    }
  } else if (prodEndpoint?.prematchGte?.next72h === 0 && prodEndpoint?.prematchAll?.pastKickoffPrematch > 500) {
    rootCause = "UPSTREAM_INDEXER_DEGRADED — subgraph stale (past-kickoff Prematch) AND sparse future pool";
  } else if (prodEndpoint?.prematchGte?.next72h === 0) {
    rootCause = "UPSTREAM_EMPTY_NEAR_TERM — even with correct endpoint, no fixtures in 72h";
  } else {
    rootCause = "PARTIAL — see per-endpoint counts";
  }

  const report = {
    phase: "pr21_azuro_endpoint_forensics",
    timestamp: new Date().toISOString(),
    nowSec: NOW_SEC,
    predictioConfig: {
      productionDefault: ENDPOINTS.dataFeedPolygon1,
      dockerCompose: ENDPOINTS.dataFeedPolygon1,
      envExampleLegacy: ENDPOINTS.legacyGnosisHosted,
      backendEnvApiUrl: "https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3",
      officialRecommendation: "https://api.onchainfeed.org/api/v1/public/market-manager (REST, not data-feed subgraph)",
    },
    endpointComparison: endpointResults,
    restMarketManager: restResults,
    oracleProbe: {
      endpoint: primaryUrl,
      gameIds: oracleGameIds,
      results: oracleProbe,
    },
    predictioProduction: predictio,
    analysis: {
      notes,
      rootCauseHypothesis: rootCause,
      azuroDocsSays: {
        dataFeedSubgraphs: "DEPRECATED (Mar 2026)",
        prematchSource: "Backend REST API market-manager",
        liveSource: "Separate LiveDataFeed subgraph on Gnosis HostChain",
        clientSubgraphs: "Bet history only — NOT feed data",
      },
    },
  };

  console.log(JSON.stringify(report, null, 2));

  if (SAVE) {
    const outDir = join(__dir, "..", "docs", "samples", "pr21");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "forensics-report.json"), JSON.stringify(report, null, 2));
    console.error("Saved to docs/samples/pr21/forensics-report.json");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
