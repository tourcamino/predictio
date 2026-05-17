#!/usr/bin/env node
/**
 * PR9 — Market integrity audit (open orders + Azuro oracle).
 * Usage: node scripts/pr9-market-integrity-audit.mjs
 */
const api = (process.env.PREDICTIO_API_BASE || "https://api.predictio.live").replace(
  /\/$/,
  "",
);
const AZURO =
  process.env.AZURO_DATA_FEED_URL ||
  "https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon";

async function main() {
  const wallet =
    process.argv[2] || "0x665cee23ea826a5e447bed2f84ae26a447fa5aea";
  const posRes = await fetch(
    `${api}/api/v1/web/user/${wallet}/positions?status=open`,
  );
  if (!posRes.ok) {
    console.error("positions HTTP", posRes.status);
    process.exit(1);
  }
  const positions = (await posRes.json()).positions ?? [];
  const marketIds = [...new Set(positions.map((p) => p.marketId))];
  const gameIds = marketIds
    .filter((id) => id.startsWith("azuro-"))
    .map((id) => id.replace(/^azuro-/, ""));

  const gRes = await fetch(AZURO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query($ids:[String!]!){ games(where:{gameId_in:$ids}){ gameId state } }`,
      variables: { ids: gameIds },
    }),
  });
  const gJson = await gRes.json();
  const games = new Map(
    (gJson.data?.games ?? []).map((g) => [String(g.gameId), g]),
  );

  const scores = { healthy: [], orphan: [], prematch: [], unsupported: [] };

  for (const mid of marketIds) {
    if (!mid.startsWith("azuro-")) {
      scores.unsupported.push({ marketId: mid, reason: "NON_AZURO" });
      continue;
    }
    const gid = mid.replace(/^azuro-/, "");
    const g = games.get(gid);
    if (!g) {
      scores.orphan.push({ marketId: mid, gameId: gid });
      continue;
    }
    if (g.state === "Prematch") {
      scores.prematch.push({ marketId: mid, gameId: gid, state: g.state });
    } else if (g.state === "Resolved" || g.state === "Finished") {
      scores.healthy.push({ marketId: mid, gameId: gid, state: g.state });
    } else {
      scores.prematch.push({ marketId: mid, gameId: gid, state: g.state });
    }
  }

  console.log(
    JSON.stringify(
      {
        auditedAt: new Date().toISOString(),
        openMarkets: marketIds.length,
        summary: {
          healthy: scores.healthy.length,
          prematch_stale: scores.prematch.length,
          subgraph_orphan: scores.orphan.length,
          non_azuro: scores.unsupported.length,
        },
        retirementCandidates: [...scores.orphan, ...scores.unsupported],
        scores,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
