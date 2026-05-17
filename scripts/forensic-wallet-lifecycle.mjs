#!/usr/bin/env node
/**
 * Full lifecycle forensics: open orders + Azuro oracle state per market.
 * Usage: node scripts/forensic-wallet-lifecycle.mjs <wallet> [apiBase]
 */
const wallet = (process.argv[2] || "").toLowerCase();
const base = (process.argv[3] || "https://api.predictio.live").replace(/\/$/, "");
const AZURO =
  process.env.AZURO_DATA_FEED_URL ||
  "https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon";

if (!wallet) {
  console.error("Usage: node scripts/forensic-wallet-lifecycle.mjs <wallet> [apiBase]");
  process.exit(1);
}

async function get(path) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

async function azuroGame(gameId) {
  const res = await fetch(AZURO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query($id:String!){ games(where:{gameId:$id}){ gameId state conditions{ conditionId state wonOutcomeIds outcomes{ outcomeId title } } } }`,
      variables: { id: gameId },
    }),
  });
  const json = await res.json();
  return json?.data?.games?.[0] ?? null;
}

function checkResolvedEligibility(game) {
  if (!game) return { eligible: false, reason: "game_not_in_subgraph" };
  const rawState = (game.state ?? "").trim();
  if (!/^(Resolved|Finished)$/i.test(rawState)) {
    return { eligible: false, reason: `oracle_state_${rawState || "unknown"}` };
  }
  const main = game.conditions?.[0];
  if (!main?.conditionId) return { eligible: false, reason: "no_condition_0" };
  const wonId = main.wonOutcomeIds?.[0];
  if (!wonId) return { eligible: false, reason: "resolved_no_wonOutcomeIds" };
  return {
    eligible: true,
    reason: "would_settle",
    conditionId: main.conditionId,
    rawState,
    wonOutcomeId: wonId,
    conditionCount: game.conditions?.length ?? 0,
    condition0State: main.state,
  };
}

async function main() {
  const { positions } = await get(
    `/api/v1/web/user-positions?walletAddress=${wallet}&status=open`,
  );
  const open = positions || [];
  console.log(JSON.stringify({ wallet, openCount: open.length, azuroUrl: AZURO }, null, 2));
  console.log("");

  const seen = new Set();
  for (const o of open) {
    const m = o.market || {};
    const gameId = String(o.marketId || "").replace(/^azuro-/, "");
    if (seen.has(o.marketId)) continue;
    seen.add(o.marketId);

    const game = gameId ? await azuroGame(gameId) : null;
    const oracle = checkResolvedEligibility(game);

    console.log("=".repeat(80));
    console.log(`marketId:    ${o.marketId}`);
    console.log(`event:       ${m.event || "?"}`);
    console.log(`gameId:      ${gameId}`);
    console.log(`order:       ${o.outcome} stake=$${o.amount} shares=${o.shares} @${o.avgPrice}`);
    console.log(`createdAt:   ${o.createdAt}`);
    console.log(`db market:   status=${m.status} winner=${m.winner ?? "—"}`);
    console.log(`db times:    closesAt=${m.closesAt} resolvedAt=${m.resolvedAt ?? "—"}`);
    console.log(`azuro game:  state=${game?.state ?? "MISSING"}`);
    console.log(`conditions:  count=${game?.conditions?.length ?? 0}`);
    console.log(`settlement:  ${oracle.eligible ? "ELIGIBLE" : "BLOCKED"} — ${oracle.reason}`);
    if (oracle.conditionId) console.log(`conditionId: ${oracle.conditionId}`);
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
