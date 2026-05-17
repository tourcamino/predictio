#!/usr/bin/env node
/**
 * Per-market settlement forensics (DB + Azuro oracle + eligibility).
 * PR6: fixed GraphQL (no invalid `status` field), moneyline condition pick.
 *
 * Usage:
 *   node scripts/forensic-market-settlement.mjs <marketId> [apiBase]
 *   node scripts/forensic-market-settlement.mjs --wallet <wallet> [apiBase]
 */
const args = process.argv.slice(2);
const base = (process.env.PREDICTIO_API_BASE || "https://api.predictio.live").replace(
  /\/$/,
  "",
);
const AZURO =
  process.env.AZURO_DATA_FEED_URL ||
  "https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon";

const AZURO_QUERY = `query($ids:[String!]!){ games(where:{gameId_in:$ids}){ gameId state conditions{ conditionId state wonOutcomeIds outcomes{ outcomeId title currentOdds } } } }`;

function parseArgs() {
  if (args[0] === "--wallet") {
    return { mode: "wallet", wallet: (args[1] || "").toLowerCase(), api: args[2] || base };
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
      query: AZURO_QUERY,
      variables: { ids: [gameId] },
    }),
  });
  const json = await res.json();
  if (json.errors?.length) console.error("Azuro:", json.errors);
  return json?.data?.games?.[0] ?? null;
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

function classify(marketId, game, dbMarket) {
  const pick = pickMoneyline(game?.conditions);
  const main = pick?.condition;
  const rawState = (game?.state ?? "").trim();
  const base = {
    conditionCount: game?.conditions?.length ?? 0,
    conditionIndex: pick?.index ?? null,
    conditionSelectionReason: pick?.reason ?? null,
    conditions0Id: game?.conditions?.[0]?.conditionId ?? null,
    index0Mismatch: pick?.index != null && pick.index !== 0,
  };

  if (!marketId.startsWith("azuro-")) {
    return { ...base, reasonCode: "NON_AZURO_MARKET", exactBlocker: "Not Azuro id" };
  }
  if (!game) {
    return { ...base, reasonCode: "GAME_NOT_IN_SUBGRAPH", exactBlocker: "gameId_in empty" };
  }
  if (!main?.conditionId) {
    return {
      ...base,
      reasonCode: "CONDITION_MISSING",
      exactBlocker: `No moneyline condition (${base.conditionCount} conditions)`,
    };
  }
  if (/^Prematch$/i.test(rawState)) {
    return {
      ...base,
      reasonCode: "ORACLE_PREMATCH",
      exactBlocker: `Oracle Prematch — settlement blocked (using condition[${pick.index}])`,
    };
  }
  if (rawState !== "Resolved" && rawState !== "Finished") {
    return {
      ...base,
      reasonCode: "ORACLE_NOT_RESOLVED",
      exactBlocker: `State "${rawState}" not terminal`,
    };
  }
  if (!main.wonOutcomeIds?.[0]) {
    return {
      ...base,
      reasonCode: "WINNER_UNKNOWN",
      exactBlocker: "No wonOutcomeIds on selected condition",
    };
  }
  const won = main.wonOutcomeIds[0];
  const outs = main.outcomes ?? [];
  if (outs.length >= 3 && outs[1]?.outcomeId === won) {
    return {
      ...base,
      reasonCode: "DRAW_UNSUPPORTED",
      exactBlocker: "Draw won",
      eligible: "refund",
    };
  }
  if ((dbMarket?.status ?? "").toLowerCase() === "resolved") {
    return {
      ...base,
      reasonCode: "MARKET_ALREADY_SETTLED",
      exactBlocker: "DB already resolved",
    };
  }
  return {
    ...base,
    reasonCode: "SETTLEMENT_ELIGIBLE",
    exactBlocker: null,
    eligible: "binary_settle",
  };
}

async function diagnoseMarket(marketId, api) {
  const gameId = marketId.replace(/^azuro-/, "");
  let dbMarket = null;
  try {
    const detail = await get(`/api/markets/${encodeURIComponent(marketId)}`, api);
    dbMarket = detail?.market ?? detail ?? null;
  } catch {
    /* optional */
  }

  const game = gameId ? await azuroGame(gameId) : null;
  const verdict = classify(marketId, game, dbMarket);
  const pick = pickMoneyline(game?.conditions);
  const main = pick?.condition;

  const report = {
    marketId,
    event:
      dbMarket?.event ??
      (dbMarket ? `${dbMarket.teamA} vs ${dbMarket.teamB}` : null),
    db: {
      status: dbMarket?.status ?? null,
      closesAt: dbMarket?.closesAt ?? null,
      resolvedAt: dbMarket?.resolvedAt ?? null,
    },
    azuro: {
      gameId,
      state: game?.state ?? null,
      conditionCount: game?.conditions?.length ?? 0,
      selectedCondition: main
        ? {
            index: pick.index,
            conditionId: main.conditionId,
            wonOutcomeIds: main.wonOutcomeIds,
            odds: main.outcomes?.map((o) => o.currentOdds),
          }
        : null,
      conditions0: game?.conditions?.[0]?.conditionId ?? null,
    },
    settlement: {
      eligibility: verdict.eligible ?? "blocked",
      reasonCode: verdict.reasonCode,
      exactBlocker: verdict.exactBlocker,
      ...verdict,
    },
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
    console.log(JSON.stringify({ wallet: opts.wallet, markets: ids.length }, null, 2));
    for (const id of ids) {
      await diagnoseMarket(id, api);
      console.log("");
    }
    return;
  }

  if (!opts.marketId) {
    console.error("Usage: <marketId> | --wallet <w>");
    process.exit(1);
  }
  await diagnoseMarket(opts.marketId, api);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
