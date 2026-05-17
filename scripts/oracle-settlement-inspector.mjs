#!/usr/bin/env node
/**
 * PR6 — Oracle / settlement inspector (wallet, market, or open-order sweep).
 *
 * Usage:
 *   node scripts/oracle-settlement-inspector.mjs --wallet 0x...
 *   node scripts/oracle-settlement-inspector.mjs --market azuro-...
 *   node scripts/oracle-settlement-inspector.mjs --open-sample 30
 */
const args = process.argv.slice(2);
const api = (process.env.PREDICTIO_API_BASE || "https://api.predictio.live").replace(
  /\/$/,
  "",
);
const AZURO =
  process.env.AZURO_DATA_FEED_URL ||
  "https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon";

const AZURO_QUERY = `query($ids:[String!]!){ games(where:{gameId_in:$ids}){ gameId state conditions{ conditionId wonOutcomeIds outcomes{ outcomeId currentOdds } } } }`;

function parseArgs() {
  if (args[0] === "--wallet") {
    return { mode: "wallet", wallet: (args[1] || "").toLowerCase() };
  }
  if (args[0] === "--market") {
    return { mode: "market", marketId: args[1] || "" };
  }
  if (args[0] === "--open-sample") {
    return { mode: "open", limit: Number(args[1] || 25) };
  }
  return { mode: "help" };
}

async function apiGet(path) {
  const res = await fetch(`${api}${path}`);
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

async function fetchGames(gameIds) {
  if (!gameIds.length) return new Map();
  const res = await fetch(AZURO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: AZURO_QUERY,
      variables: { ids: gameIds },
    }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    console.error("Azuro errors:", json.errors);
  }
  const map = new Map();
  for (const g of json?.data?.games ?? []) {
    map.set(String(g.gameId), g);
  }
  return map;
}

function pickMoneyline(conditions) {
  if (!conditions?.length) return null;
  const three = conditions
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => (c.outcomes?.length ?? 0) === 3);
  if (!three.length) {
    return conditions[0]?.conditionId
      ? { condition: conditions[0], index: 0, reason: "fallback_0" }
      : null;
  }
  for (const item of three) {
    const odds = item.c.outcomes.map((o) => parseFloat(o.currentOdds || "0"));
    if (odds.every((x) => x >= 1.01 && x <= 80)) {
      return { condition: item.c, index: item.index, reason: "first_plausible_3way" };
    }
  }
  return { condition: three[0].c, index: three[0].index, reason: "first_3way" };
}

function classify(marketId, game, db) {
  const gameId = marketId.replace(/^azuro-/, "");
  const rawState = (game?.state ?? "").trim();
  const pick = pickMoneyline(game?.conditions);
  const main = pick?.condition;
  const row = {
    marketId,
    gameId,
    closesAt: db?.closesAt ?? null,
    dbStatus: db?.status ?? null,
    oracleState: rawState || (game ? "unknown" : "MISSING"),
    conditionCount: game?.conditions?.length ?? 0,
    conditionIndex: pick?.index ?? null,
    conditionId: main?.conditionId ?? null,
    selectionReason: pick?.reason ?? null,
    wonOutcomeIds: main?.wonOutcomeIds ?? [],
    conditions0Id: game?.conditions?.[0]?.conditionId ?? null,
    index0Mismatch:
      pick?.index != null && pick.index !== 0 ? true : false,
  };

  if (!game) {
    row.reasonCode = "GAME_NOT_IN_SUBGRAPH";
    row.blocker = "Subgraph returned no game for gameId_in";
    row.eligible = false;
    return row;
  }
  if (!main?.conditionId) {
    row.reasonCode = "CONDITION_MISSING";
    row.blocker = "No moneyline condition selected";
    row.eligible = false;
    return row;
  }
  if (/^Prematch$/i.test(rawState)) {
    row.reasonCode = "ORACLE_PREMATCH";
    row.blocker = "Oracle still Prematch — cannot settle";
    row.eligible = false;
    return row;
  }
  if (rawState !== "Resolved" && rawState !== "Finished") {
    row.reasonCode = "ORACLE_NOT_RESOLVED";
    row.blocker = `State ${rawState} not terminal`;
    row.eligible = false;
    return row;
  }
  if (!main.wonOutcomeIds?.[0]) {
    row.reasonCode = "WINNER_UNKNOWN";
    row.blocker = "Terminal but no wonOutcomeIds on selected condition";
    row.eligible = false;
    return row;
  }
  const won = main.wonOutcomeIds[0];
  const outs = main.outcomes ?? [];
  if (outs.length >= 3 && outs[1]?.outcomeId === won) {
    row.reasonCode = "DRAW_UNSUPPORTED";
    row.blocker = "Draw won — refund path";
    row.eligible = "refund";
    return row;
  }
  row.reasonCode = "SETTLEMENT_ELIGIBLE";
  row.blocker = null;
  row.eligible = true;
  return row;
}

async function diagnoseMarket(marketId, gamesMap) {
  const gameId = marketId.replace(/^azuro-/, "");
  let db = null;
  try {
    const detail = await apiGet(`/api/markets/${encodeURIComponent(marketId)}`);
    db = detail?.market ?? detail;
  } catch {
    /* optional */
  }
  const game = gamesMap.get(gameId) ?? null;
  return classify(marketId, game, db);
}

async function main() {
  const opts = parseArgs();
  if (opts.mode === "help") {
    console.error(
      "Usage: --wallet <addr> | --market <id> | --open-sample <n>",
    );
    process.exit(1);
  }

  let marketIds = [];
  if (opts.mode === "wallet") {
    const { positions } = await apiGet(
      `/api/v1/web/user-positions?walletAddress=${opts.wallet}&status=open`,
    );
    marketIds = [...new Set((positions ?? []).map((p) => p.marketId))];
    console.log(JSON.stringify({ wallet: opts.wallet, openMarkets: marketIds.length }, null, 2));
  } else if (opts.mode === "market") {
    marketIds = [opts.marketId];
  } else {
    const health = await apiGet("/api/trpc/getSettlementProtocolHealth").catch(() => null);
    if (!health) {
      console.error("Use --wallet or --market; open-sample needs tRPC on API host");
      process.exit(1);
    }
    marketIds = (health?.result?.data?.samples ?? []).map((s) => s.marketId);
  }

  const gameIds = marketIds
    .filter((id) => id.startsWith("azuro-"))
    .map((id) => id.replace(/^azuro-/, ""));

  const gamesMap = await fetchGames(gameIds);
  const reports = [];
  for (const mid of marketIds) {
    reports.push(await diagnoseMarket(mid, gamesMap));
  }

  const summary = reports.reduce(
    (acc, r) => {
      acc[r.reasonCode] = (acc[r.reasonCode] ?? 0) + 1;
      return acc;
    },
    {},
  );

  console.log(JSON.stringify({ summary, reports }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
