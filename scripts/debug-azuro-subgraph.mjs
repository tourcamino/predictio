/**
 * Smoke test: Azuro V3 **data-feed** subgraph (games / state / sport).
 * Usage: node scripts/debug-azuro-subgraph.mjs
 *
 * Env: AZURO_DATA_FEED_URL (preferred) or AZURO_GRAPHQL_URL — defaults to Polygon onchainfeed data-feed.
 */
const DEFAULT_V3_DATA_FEED =
  "https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon";

const url =
  process.env.AZURO_DATA_FEED_URL?.trim() ||
  process.env.AZURO_GRAPHQL_URL?.trim() ||
  DEFAULT_V3_DATA_FEED;

const V3_QUERY = `
  query Smoke {
    games(
      first: 15
      where: { state: Prematch, activeConditionsCount_gt: 0 }
      orderBy: startsAt
      orderDirection: asc
    ) {
      gameId
      state
      startsAt
      sport { name slug }
      league { name country { name } }
    }
  }
`;

async function main() {
  console.log("URL:", url);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: V3_QUERY }),
  });
  const text = await res.text();
  console.log("HTTP", res.status);
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.log(text.slice(0, 600));
    process.exit(1);
  }
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }
  const games = json.data?.games || [];
  console.log("games.length:", games.length);
  for (const g of games.slice(0, 8)) {
    console.log(
      "-",
      g.gameId,
      g.state,
      g.sport?.slug || g.sport?.name,
      "startsAt",
      g.startsAt,
      g.league?.name,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
