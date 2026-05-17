#!/usr/bin/env node
/** Find 1X2 (3-outcome) conditions among Azuro game conditions */
const AZURO =
  process.env.AZURO_DATA_FEED_URL ||
  "https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon";
const gid = process.argv[2] || "1006000000000077352066";

const res = await fetch(AZURO, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `query($ids:[String!]!){ games(where:{gameId_in:$ids}){ gameId state conditions{ conditionId wonOutcomeIds outcomes{ outcomeId title currentOdds } } } }`,
    variables: { ids: [gid] },
  }),
});
const game = (await res.json())?.data?.games?.[0];
if (!game) {
  console.log("no game");
  process.exit(1);
}
console.log("game state:", game.state);
const three = [];
for (const [i, c] of (game.conditions ?? []).entries()) {
  const n = c.outcomes?.length ?? 0;
  if (n === 3) {
    three.push({
      index: i,
      conditionId: c.conditionId,
      won: c.wonOutcomeIds,
      titles: c.outcomes?.map((o) => o.title),
      odds: c.outcomes?.map((o) => o.currentOdds),
    });
  }
}
console.log("total conditions:", game.conditions?.length);
console.log("3-outcome conditions:", three.length);
console.log(JSON.stringify(three.slice(0, 8), null, 2));
