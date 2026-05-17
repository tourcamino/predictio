#!/usr/bin/env node
const AZURO =
  process.env.AZURO_DATA_FEED_URL ||
  "https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon";
const gid = process.argv[2] || "1006000000000077352066";

async function q(query, variables) {
  const r = await fetch(AZURO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

const queries = [
  {
    name: "gameId_string",
    query: `query($id: String!) { games(where: { gameId: $id }) { gameId state status conditions { conditionId state wonOutcomeIds outcomes { outcomeId title } } } }`,
    variables: { id: gid },
  },
  {
    name: "gameId_in",
    query: `query($ids: [String!]!) { games(where: { gameId_in: $ids }) { gameId state conditions { conditionId wonOutcomeIds outcomes { outcomeId } } } }`,
    variables: { ids: [gid] },
  },
  {
    name: "id_filter",
    query: `query($id: ID!) { games(where: { id: $id }) { id gameId state } }`,
    variables: { id: gid },
  },
];

for (const t of queries) {
  const json = await q(t.query, t.variables);
  const games = json?.data?.games ?? [];
  console.log("\n===", t.name, "===");
  if (json.errors) console.log("errors:", json.errors);
  console.log("count:", games.length);
  if (games[0]) {
    const g = games[0];
    console.log("state:", g.state, "status:", g.status);
    console.log("conditions:", g.conditions?.length);
    g.conditions?.forEach((c, i) => {
      console.log(
        `  [${i}] id=${c.conditionId?.slice(0, 12)}… state=${c.state} won=${c.wonOutcomeIds?.join(",")}`,
      );
    });
  }
}
