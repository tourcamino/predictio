#!/usr/bin/env node
/**
 * PR16 — Full oracle awaiting forensics for a wallet.
 * Usage: node scripts/pr16-oracle-awaiting-forensics.mjs [wallet]
 */
const wallet = (process.argv[2] || "0x665cee23ea826a5e447bed2f84ae26a447fa5aea").toLowerCase();
const api = (process.env.PREDICTIO_API_BASE || "https://api.predictio.live").replace(/\/$/, "");
const AZURO =
  process.env.AZURO_DATA_FEED_URL ||
  "https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon";

const AZURO_QUERY = `query($ids:[String!]!){
  games(where:{gameId_in:$ids}) {
    gameId state startsAt
    conditions { conditionId state wonOutcomeIds outcomes { outcomeId currentOdds } }
  }
}`;

async function apiGet(path) {
  const res = await fetch(`${api}${path}`);
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

async function fetchGames(gameIds) {
  const res = await fetch(AZURO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: AZURO_QUERY, variables: { ids: gameIds } }),
  });
  const json = await res.json();
  const map = new Map();
  for (const g of json?.data?.games ?? []) map.set(String(g.gameId), g);
  return map;
}

function pickMoneyline(conditions) {
  if (!conditions?.length) return null;
  const three = conditions.map((c, i) => ({ c, i })).filter(({ c }) => (c.outcomes?.length ?? 0) === 3);
  if (!three.length) return conditions[0] ? { condition: conditions[0], index: 0 } : null;
  for (const item of three) {
    const odds = item.c.outcomes.map((o) => parseFloat(o.currentOdds || "0"));
    if (odds.every((x) => x >= 1.01 && x <= 80)) return { condition: item.c, index: item.index };
  }
  return { condition: three[0].c, index: three[0].index };
}

async function main() {
  const positions = await apiGet(
    `/api/v1/web/user-positions?walletAddress=${wallet}&status=open`,
  );
  const open = positions.positions ?? [];

  const gameIds = [...new Set(open.map((p) => String(p.marketId).replace(/^azuro-/, "")))];
  const games = await fetchGames(gameIds);

  const reports = [];
  for (const pos of open) {
    const marketId = pos.marketId;
    const gameId = marketId.replace(/^azuro-/, "");
    const game = games.get(gameId);
    const pick = game ? pickMoneyline(game.conditions) : null;
    const closesAt = pos.closesAt || pos.market?.closesAt || null;
    const ftMs = closesAt ? Date.parse(closesAt) : null;
    const hoursSinceFt =
      ftMs != null && Number.isFinite(ftMs) ? (Date.now() - ftMs) / 3_600_000 : null;

    let blocker = "unknown";
    let classification = "F";
    const state = game?.state ?? "MISSING";
    if (!game) {
      blocker = "GAME_NOT_IN_SUBGRAPH";
      classification = "F";
    } else if (state === "Prematch") {
      blocker = "ORACLE_PREMATCH_UPSTREAM";
      classification = hoursSinceFt != null && hoursSinceFt > 24 ? "F" : "D";
    } else if (state === "Resolved" || state === "Finished") {
      blocker = pick?.condition?.wonOutcomeIds?.[0]
        ? "SETTLEMENT_ELIGIBLE"
        : "WINNER_UNKNOWN";
      classification = blocker === "SETTLEMENT_ELIGIBLE" ? "A" : "D";
    } else {
      blocker = `ORACLE_STATE_${state}`;
      classification = "C";
    }

    reports.push({
      marketId,
      gameId,
      event: pos.event || pos.marketEvent,
      outcome: pos.outcome,
      amount: pos.amount,
      closesAt,
      hoursSinceFt: hoursSinceFt != null ? Math.round(hoursSinceFt * 10) / 10 : null,
      oracleState: state,
      oracleSource: AZURO,
      conditionIndex: pick?.index ?? null,
      conditionId: pick?.condition?.conditionId ?? null,
      wonOutcomeIds: pick?.condition?.wonOutcomeIds ?? [],
      conditions0Id: game?.conditions?.[0]?.conditionId ?? null,
      index0Mismatch:
        pick?.condition?.conditionId != null &&
        game?.conditions?.[0]?.conditionId != null &&
        pick.condition.conditionId !== game.conditions[0].conditionId,
      settlementEligibility: blocker === "SETTLEMENT_ELIGIBLE",
      settlementBlocker: blocker,
      archivedOrphan: !game || state === "MISSING",
      healthGrade: classification,
    });
  }

  const summary = reports.reduce((acc, r) => {
    acc[r.settlementBlocker] = (acc[r.settlementBlocker] || 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({ wallet, openCount: open.length, summary, reports }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
