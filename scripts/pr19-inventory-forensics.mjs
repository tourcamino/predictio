#!/usr/bin/env node
/**
 * PR19 — Full inventory collapse forensics: raw Azuro → pipeline → APIs.
 * Usage: node scripts/pr19-inventory-forensics.mjs [--save-samples]
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const SAVE = process.argv.includes("--save-samples");
const AZURO =
  process.env.AZURO_DATA_FEED_URL ||
  "https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon";
const API = (process.env.PREDICTIO_API_BASE || "https://api.predictio.live").replace(/\/$/, "");
const NOW_SEC = Math.floor(Date.now() / 1000);
const H72 = NOW_SEC + 72 * 3600;
const H24 = NOW_SEC + 24 * 3600;
const D30 = NOW_SEC + 30 * 86400;

const LEAGUE_PATTERNS = {
  premier: /premier league|english premier/i,
  ucl: /champions league|uefa champions/i,
  serieA: /serie a/i,
  laliga: /la liga|laliga/i,
  bundesliga: /bundesliga/i,
  worldCup: /world cup|fifa/i,
};

async function gql(query, variables = {}) {
  const res = await fetch(AZURO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(JSON.stringify(json.errors).slice(0, 500));
  }
  return json.data;
}

async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text.slice(0, 200) };
  }
}

function classifyLeague(name) {
  const n = name || "";
  for (const [k, re] of Object.entries(LEAGUE_PATTERNS)) {
    if (re.test(n)) return k;
  }
  return "other";
}

function dayKey(sec) {
  return new Date(sec * 1000).toISOString().slice(0, 10);
}

function summarizeGames(games, label) {
  const football = games.filter((g) => {
    const slug = (g.sport?.slug || "").toLowerCase();
    const name = (g.sport?.name || "").toLowerCase();
    return slug === "football" || slug === "soccer" || name.includes("football");
  });
  const in72 = games.filter((g) => +g.startsAt >= NOW_SEC && +g.startsAt <= H72);
  const in24 = games.filter((g) => +g.startsAt >= NOW_SEC && +g.startsAt <= H24);
  const beyond30d = games.filter((g) => +g.startsAt > D30);
  const leagueCounts = {};
  const dayCounts = {};
  for (const g of games) {
    const ln = g.league?.name || "unknown";
    leagueCounts[ln] = (leagueCounts[ln] || 0) + 1;
    const dk = dayKey(+g.startsAt);
    dayCounts[dk] = (dayCounts[dk] || 0) + 1;
  }
  const patternCounts = { premier: 0, ucl: 0, serieA: 0, laliga: 0, bundesliga: 0, worldCup: 0, other: 0 };
  for (const g of games) {
    patternCounts[classifyLeague(g.league?.name)] =
      (patternCounts[classifyLeague(g.league?.name)] || 0) + 1;
  }
  return {
    label,
    total: games.length,
    football: football.length,
    next24h: in24.length,
    next72h: in72.length,
    beyond30d: beyond30d.length,
    patternCounts,
    topLeagues: Object.entries(leagueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15),
    perDay: Object.entries(dayCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 20),
    nearest72h: in72.slice(0, 10).map((g) => ({
      title: g.title,
      league: g.league?.name,
      startsAt: new Date(+g.startsAt * 1000).toISOString(),
      gameId: g.gameId,
    })),
  };
}

const GAMES_FIELDS = `
  gameId title startsAt state activeConditionsCount
  sport { name slug }
  league { name slug country { name } }
  participants { name sortOrder }
`;

async function fetchAllPrematch(useGte) {
  const all = [];
  const pageSize = 250;
  for (let page = 0; page < 20; page++) {
    const skip = page * pageSize;
    let data;
    if (useGte) {
      const q = `query($first:Int!,$skip:Int!,$min:BigInt!){
        games(first:$first,skip:$skip,where:{state:Prematch,activeConditionsCount_gt:0,startsAt_gte:$min},orderBy:startsAt,orderDirection:asc){
          ${GAMES_FIELDS}
        }}`;
      data = await gql(q, { first: pageSize, skip, min: String(NOW_SEC) });
    } else {
      const q = `query($first:Int!,$skip:Int!){
        games(first:$first,skip:$skip,where:{state:Prematch,activeConditionsCount_gt:0},orderBy:startsAt,orderDirection:asc){
          ${GAMES_FIELDS}
        }}`;
      data = await gql(q, { first: pageSize, skip });
    }
    const batch = data.games || [];
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}

async function fetchLiveGames() {
  const q = `query{
    games(first:100,where:{state:Live,activeConditionsCount_gt:0},orderBy:startsAt,orderDirection:desc){
      ${GAMES_FIELDS}
    }}`;
  const data = await gql(q);
  return data.games || [];
}

function simulatePipelineRejections(games) {
  const windowEnd = NOW_SEC + 90 * 86400;
  const reasons = {};
  const samples = [];
  const bump = (r, g) => {
    reasons[r] = (reasons[r] || 0) + 1;
    if (samples.filter((s) => s.reason === r).length < 3) {
      samples.push({
        reason: r,
        title: g.title,
        league: g.league?.name,
        startsAt: new Date(+g.startsAt * 1000).toISOString(),
      });
    }
  };
  let passed = 0;
  for (const g of games) {
    const gid = String(g.gameId || "").trim();
    const k = +g.startsAt;
    if (!gid) {
      bump("no_game_id", g);
      continue;
    }
    if (!Number.isFinite(k)) {
      bump("bad_kickoff", g);
      continue;
    }
    if (k <= NOW_SEC) {
      bump("kickoff_past", g);
      continue;
    }
    if (k >= windowEnd) {
      bump("outside_window", g);
      continue;
    }
    const state = String(g.state || "").toLowerCase();
    if (state && state !== "prematch" && state !== "open") {
      bump("not_open_state", g);
      continue;
    }
    const parts = g.participants || [];
    if (parts.length < 2 || !parts[0]?.name || !parts[1]?.name) {
      bump("participants", g);
      continue;
    }
    if (Number(g.activeConditionsCount || 0) <= 0) {
      bump("no_active_conditions", g);
      continue;
    }
    passed++;
  }
  return { passed, reasons, samples };
}

async function main() {
  console.log(JSON.stringify({ phase: "pr19_start", at: new Date().toISOString(), nowSec: NOW_SEC }));

  const [allPrematch, gtePrematch, liveGames] = await Promise.all([
    fetchAllPrematch(false),
    fetchAllPrematch(true),
    fetchLiveGames().catch(() => []),
  ]);

  const rawSummary = summarizeGames(allPrematch, "all_prematch");
  const gteSummary = summarizeGames(gtePrematch, "startsAt_gte_now");
  const liveSummary = summarizeGames(liveGames, "live_state");
  const pipeline = simulatePipelineRejections(gtePrematch);

  const [version, curated, v1markets, v1hot] = await Promise.all([
    apiGet("/api/v1/version"),
    apiGet("/api/markets?limit=50"),
    apiGet("/api/v1/markets?sort=vitality&limit=20"),
    apiGet("/api/v1/markets/hot"),
  ]);

  const curatedMarkets = curated.data?.markets || [];
  const curatedSummary = {
    count: curatedMarkets.length,
    leagues: [...new Set(curatedMarkets.map((m) => m.leagueName))].slice(0, 20),
    next72h: curatedMarkets.filter((m) => {
      const t = Date.parse(m.startsAt);
      return t >= Date.now() && t <= Date.now() + 72 * 3600 * 1000;
    }).length,
    nearest: curatedMarkets.slice(0, 5).map((m) => ({
      title: m.title,
      league: m.leagueName,
      startsAt: m.startsAt,
    })),
  };

  const report = {
    azuroEndpoint: AZURO,
    apiEndpoint: API,
    timestamp: new Date().toISOString(),
    rawAzuro: { allPrematch: rawSummary, withStartsAtGte: gteSummary, live: liveSummary },
    pipelineSimulation: pipeline,
    productionApis: {
      version: version.data,
      curated: curatedSummary,
      v1marketsCount: v1markets.data?.markets?.length ?? 0,
      v1hotCount: v1hot.data?.markets?.length ?? 0,
    },
    collapseVerdict: null,
  };

  // Verdict logic
  if (gteSummary.next72h === 0 && gteSummary.patternCounts.premier === 0) {
    if (gteSummary.patternCounts.worldCup > 0 && gteSummary.beyond30d === 0) {
      report.collapseVerdict =
        "UPSTREAM_AZURO_PREMATCH_POOL — Polygon data-feed returns only far-future international fixtures; no domestic PL/UCL in Prematch index. Predictio filters are NOT the primary killer.";
    } else if (allPrematch.length > gtePrematch.length) {
      report.collapseVerdict =
        "STARTS_AT_GTE_OR_PAGINATION — games exist without gte filter but drop with startsAt_gte:now";
    } else {
      report.collapseVerdict =
        "UPSTREAM_AZURO_EMPTY_NEAR_TERM — zero fixtures in next 72h at GraphQL source";
    }
  } else if (pipeline.passed < gteSummary.next72h) {
    report.collapseVerdict = "PIPELINE_FILTER — events rejected in emergencyMinimalTradable simulation";
  } else if (curatedSummary.next72h === 0 && gteSummary.next72h > 0) {
    report.collapseVerdict = "POST_INGEST_COLLAPSE — raw has near-term games but API does not";
  } else {
    report.collapseVerdict = "PARTIAL — see per-stage counts";
  }

  console.log(JSON.stringify(report, null, 2));

  if (SAVE) {
    const outDir = join(__dir, "..", "docs", "samples", "pr19");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "azuro-all-prematch.json"), JSON.stringify(allPrematch.slice(0, 100), null, 2));
    writeFileSync(join(outDir, "azuro-gte-prematch.json"), JSON.stringify(gtePrematch.slice(0, 100), null, 2));
    writeFileSync(join(outDir, "api-curated-markets.json"), JSON.stringify(curated.data, null, 2));
    writeFileSync(join(outDir, "forensics-report.json"), JSON.stringify(report, null, 2));
    console.error("Samples saved to docs/samples/pr19/");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
