#!/usr/bin/env node
/**
 * Per-market settlement forensics (DB + Azuro oracle + eligibility).
 *
 * Usage:
 *   node scripts/forensic-market-settlement.mjs <marketId> [apiBase]
 *   node scripts/forensic-market-settlement.mjs --wallet <wallet> [apiBase]
 *   node scripts/forensic-market-settlement.mjs --search "Gnistan" [apiBase]
 */
const args = process.argv.slice(2);
const base = (process.env.PREDICTIO_API_BASE || "https://api.predictio.live").replace(
  /\/$/,
  "",
);
const AZURO =
  process.env.AZURO_DATA_FEED_URL ||
  "https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon";

function parseArgs() {
  if (args[0] === "--wallet") {
    return { mode: "wallet", wallet: (args[1] || "").toLowerCase(), api: args[2] || base };
  }
  if (args[0] === "--search") {
    return { mode: "search", q: args[1] || "", api: args[2] || base };
  }
  return { mode: "market", marketId: args[0] || "", api: args[1] || base };
}

async function get(path, api) {
  const res = await fetch(`${api}${path}`);
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

async function azuroGame(gameId) {
  const res = await fetch(AZURO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query($id:String!){ games(where:{gameId:$id}){ gameId state status conditions{ conditionId state wonOutcomeIds outcomes{ outcomeId title } } } }`,
      variables: { id: gameId },
    }),
  });
  const json = await res.json();
  return json?.data?.games?.[0] ?? null;
}

function classify(marketId, game, dbMarket) {
  const closesAt = dbMarket?.closesAt ?? null;
  const rawState = (game?.state ?? game?.status ?? "").trim();
  const main = game?.conditions?.[0];
  const conditionId = main?.conditionId ?? null;
  const hasWinner = Boolean(main?.wonOutcomeIds?.[0]);

  if (!marketId.startsWith("azuro-")) {
    return { reasonCode: "NON_AZURO_MARKET", blocker: "Not an Azuro market id" };
  }
  if (!game) {
    return { reasonCode: "GAME_NOT_IN_SUBGRAPH", blocker: "Game missing from Azuro subgraph" };
  }
  if (!conditionId) {
    return {
      reasonCode: "CONDITION_MISSING",
      blocker: `No conditions[0].conditionId (${game.conditions?.length ?? 0} conditions)`,
    };
  }
  if (/^Prematch$/i.test(rawState)) {
    return {
      reasonCode: "ORACLE_PREMATCH",
      blocker: "Azuro game.state still Prematch — settlement tick skips",
    };
  }
  if (rawState !== "Resolved" && rawState !== "Finished") {
    return {
      reasonCode: "ORACLE_NOT_RESOLVED",
      blocker: `Oracle state "${rawState || "unknown"}" not terminal`,
    };
  }
  if (!hasWinner) {
    return {
      reasonCode: "WINNER_UNKNOWN",
      blocker: "Terminal state but wonOutcomeIds empty",
    };
  }
  const wonId = main.wonOutcomeIds[0];
  const outs = main.outcomes ?? [];
  if (outs.length >= 3 && outs[1]?.outcomeId && wonId === outs[1].outcomeId) {
    return {
      reasonCode: "DRAW_UNSUPPORTED",
      blocker: "Draw won — refund path, not binary YES/NO",
      eligible: "refund",
    };
  }
  if ((dbMarket?.status ?? "").toLowerCase() === "resolved") {
    return {
      reasonCode: "MARKET_ALREADY_SETTLED",
      blocker: "DB market already resolved",
    };
  }
  return {
    reasonCode: "SETTLEMENT_ELIGIBLE",
    blocker: null,
    eligible: "binary_settle",
  };
}

async function diagnoseMarket(marketId, api) {
  const gameId = marketId.replace(/^azuro-/, "");
  let dbMarket = null;
  let openOrders = [];
  try {
    const detail = await get(`/api/markets/${encodeURIComponent(marketId)}`, api);
    dbMarket = detail?.market ?? detail ?? null;
  } catch {
    /* optional */
  }
  try {
    const markets = await get("/api/markets", api);
    const row = (markets.markets ?? []).find((m) => m.id === marketId);
    if (row && !dbMarket) dbMarket = row;
  } catch {
    /* optional */
  }

  const game = gameId ? await azuroGame(gameId) : null;
  const verdict = classify(marketId, game, dbMarket);

  const report = {
    marketId,
    event:
      dbMarket?.event ??
      (dbMarket ? `${dbMarket.teamA} vs ${dbMarket.teamB}` : null),
    db: {
      status: dbMarket?.status ?? null,
      winner: dbMarket?.winner ?? dbMarket?.result ?? null,
      closesAt: dbMarket?.closesAt ?? null,
      resolvedAt: dbMarket?.resolvedAt ?? dbMarket?.resolved_at ?? null,
    },
    azuro: {
      gameId,
      state: game?.state ?? null,
      conditionCount: game?.conditions?.length ?? 0,
      condition0: game?.conditions?.[0]
        ? {
            conditionId: game.conditions[0].conditionId,
            state: game.conditions[0].state,
            wonOutcomeIds: game.conditions[0].wonOutcomeIds,
          }
        : null,
    },
    settlement: {
      eligibility: verdict.eligible ?? "blocked",
      reasonCode: verdict.reasonCode,
      exactBlocker: verdict.blocker,
    },
    openOrders,
  };

  console.log(JSON.stringify(report, null, 2));
  return report;
}

async function main() {
  const opts = parseArgs();
  const api = opts.api || base;

  if (opts.mode === "wallet") {
    if (!opts.wallet) {
      console.error("Usage: --wallet <address>");
      process.exit(1);
    }
    const { positions } = await get(
      `/api/v1/web/user-positions?walletAddress=${opts.wallet}&status=open`,
      api,
    );
    const ids = [...new Set((positions ?? []).map((p) => p.marketId))];
    for (const id of ids) {
      await diagnoseMarket(id, api);
      console.log("");
    }
    return;
  }

  if (opts.mode === "search") {
    const { markets } = await get("/api/markets", api);
    const q = (opts.q || "").toLowerCase();
    const hits = (markets ?? []).filter((m) => {
      const t = `${m.event || ""} ${m.teamA || ""} ${m.teamB || ""}`.toLowerCase();
      return t.includes(q);
    });
    if (hits.length === 0) {
      console.error("No markets matched:", opts.q);
      process.exit(1);
    }
    for (const m of hits.slice(0, 12)) {
      await diagnoseMarket(m.id, api);
      console.log("");
    }
    return;
  }

  if (!opts.marketId) {
    console.error(
      "Usage: node scripts/forensic-market-settlement.mjs <marketId> | --wallet <w> | --search <text>",
    );
    process.exit(1);
  }

  await diagnoseMarket(opts.marketId, api);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
