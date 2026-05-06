/**
 * Quick check: Azuro Base v3 subgraph returns upcoming games.
 * Usage: node scripts/debug-azuro-subgraph.mjs
 */
/** Optional: AZURO_GRAPHQL_URL=... to test one deployment. Linea/other chains: add URL only if Azuro publishes it. */
const URLS = (
  process.env.AZURO_GRAPHQL_URL?.trim()
    ? [process.env.AZURO_GRAPHQL_URL.trim()]
    : [
        "https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-base-v3",
        "https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3",
      ]
);

const QUERY = `
  query Q($first: Int!, $where: Game_filter) {
    games(first: $first, where: $where, orderBy: startsAt, orderDirection: asc) {
      gameId
      sport { name }
      startsAt
      status
      league { name }
    }
  }
`;

async function main() {
  const nowSec = Math.floor(Date.now() / 1000);
  console.log("nowSec", nowSec, new Date(nowSec * 1000).toISOString());

  const variants = [
    {
      label: "status_in Created/Paused + startsAt_gt",
      where: {
        status_in: ["Created", "Paused"],
        startsAt_gt: String(nowSec),
      },
    },
    {
      label: "startsAt_gt only (no status)",
      where: {
        startsAt_gt: String(nowSec),
      },
    },
    {
      label: "first 5 games no filter",
      where: {},
    },
  ];

  for (const URL of URLS) {
    console.log("\n######## URL:", URL);
    for (const v of variants) {
    const body = {
      query: QUERY,
      variables: {
        first: v.label.includes("no filter") ? 5 : 15,
        where: v.where,
      },
    };

    const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
    const text = await res.text();
    console.log("\n---", v.label, "---");
    console.log("HTTP", res.status);
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.log(text.slice(0, 500));
      continue;
    }
    if (json.errors) {
      console.log("GraphQL errors:", JSON.stringify(json.errors, null, 2));
      continue;
    }
    const games = json.data?.games || [];
    console.log("games.length:", games.length);
    for (const g of games.slice(0, 5)) {
      console.log(
        "-",
        g.gameId,
        g.sport?.name,
        "startsAt",
        g.startsAt,
        "status",
        JSON.stringify(g.status),
        g.league?.name,
      );
    }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
