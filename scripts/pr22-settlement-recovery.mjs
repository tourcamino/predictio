#!/usr/bin/env node
/**
 * PR22 — Settlement recovery probe (REST oracle vs legacy subgraph).
 * Usage: node scripts/pr22-settlement-recovery.mjs [--wallet 0x...]
 */
const WALLET =
  process.argv.find((a, i) => process.argv[i - 1] === "--wallet") ||
  "0x665cee23ea826a5e447bed2f84ae26a447fa5aea";
const API = (process.env.PREDICTIO_API_BASE || "https://api.predictio.live").replace(/\/$/, "");

async function main() {
  const positions = await fetch(
    `${API}/api/v1/web/user-positions?walletAddress=${WALLET}&status=open`,
  ).then((r) => r.json());

  const marketIds = [...new Set((positions.positions || []).map((p) => p.marketId))];
  console.log(JSON.stringify({ wallet: WALLET, openPositions: marketIds.length, marketIds }, null, 2));

  for (const mid of marketIds.filter((m) => m.startsWith("azuro-"))) {
    const gid = mid.replace("azuro-", "");
    const [restGame, restCond, sub] = await Promise.all([
      fetch("https://api.onchainfeed.org/api/v1/public/market-manager/games-by-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameIds: [gid] }),
      }).then((r) => r.json()),
      fetch("https://api.onchainfeed.org/api/v1/public/market-manager/conditions-by-game-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment: "PolygonUSDT", gameIds: [gid] }),
      }).then((r) => r.json()),
      fetch("https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query($id:String!){games(where:{gameId:$id}){gameId state conditions{state wonOutcomeIds}}}`,
          variables: { id: gid },
        }),
      }).then((r) => r.json()),
    ]);

    const resolved = (restCond.conditions || []).filter(
      (c) => c.state === "Resolved" && c.wonOutcomeIds?.length,
    );
    console.log(
      JSON.stringify({
        marketId: mid,
        rest: {
          gameState: restGame.games?.[0]?.state,
          resolvedConditions: resolved.length,
          sampleWinner: resolved[0]?.wonOutcomeIds,
        },
        subgraph: {
          gameState: sub.data?.games?.[0]?.state,
          conditions: sub.data?.games?.[0]?.conditions?.length ?? 0,
        },
        settlementEligibleRest: ["Finished", "Resolved"].includes(restGame.games?.[0]?.state) && resolved.length > 0,
      }),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
