/**
 * PR22 — Select oracle provider + regression logging.
 */
import { AzuroLegacySubgraphProvider } from "./azuroLegacySubgraphProvider";
import { AzuroRestOracleProvider, isAzuroRestOracleEnabled } from "./azuroRestOracleProvider";
import type { OracleMarketSnapshot, OracleProvider } from "./types";

let restProvider: AzuroRestOracleProvider | null = null;
let legacyProvider: AzuroLegacySubgraphProvider | null = null;

export function getPrimaryOracleProvider(): OracleProvider {
  if (isAzuroRestOracleEnabled()) {
    restProvider ??= new AzuroRestOracleProvider();
    return restProvider;
  }
  legacyProvider ??= new AzuroLegacySubgraphProvider();
  return legacyProvider;
}

export function getFallbackOracleProvider(): OracleProvider | null {
  if (!isAzuroRestOracleEnabled()) return null;
  legacyProvider ??= new AzuroLegacySubgraphProvider();
  return legacyProvider;
}

/** Poll with REST primary; optional legacy fallback if REST returns empty game. */
export async function pollAzuroOracleSnapshots(
  gameIds: string[],
): Promise<{ snapshots: OracleMarketSnapshot[]; source: string }> {
  const primary = getPrimaryOracleProvider();
  const started = Date.now();
  let snapshots = await primary.pollGames(gameIds);

  const missing = gameIds.filter(
    (id) => !snapshots.find((s) => s.gameId === id && s.gameState != null),
  );
  const fallback = getFallbackOracleProvider();
  if (missing.length > 0 && fallback) {
    const legacySnaps = await fallback.pollGames(missing);
    const byId = new Map(snapshots.map((s) => [s.gameId, s]));
    for (const snap of legacySnaps) {
      if (!byId.has(snap.gameId) || byId.get(snap.gameId)?.gameState == null) {
        byId.set(snap.gameId, snap);
      }
    }
    snapshots = [...byId.values()];
  }

  console.log(
    JSON.stringify({
      tag: "SETTLEMENT_SOURCE",
      SETTLEMENT_SOURCE: primary.sourceId,
      ORACLE_SOURCE: primary.sourceId,
      polledGames: gameIds.length,
      returnedSnapshots: snapshots.length,
      latencyMs: Date.now() - started,
    }),
  );

  return { snapshots, source: primary.sourceId };
}

export function snapshotToAzuroGame(snap: OracleMarketSnapshot) {
  return {
    gameId: snap.gameId,
    state: snap.gameState ?? undefined,
    status: snap.gameState ?? undefined,
    conditions: snap.conditions,
  };
}
