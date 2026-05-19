/**
 * PR22 — Deprecated Azuro data-feed subgraph oracle. Fallback only — known stale.
 */
import { getAzuroGraphqlEndpoint } from "~/services/azuro";
import type { AzuroConditionLike } from "~/lib/settlement/azuroConditionSelection";

import type { OracleMarketSnapshot, OracleProvider, OracleProviderHealth } from "./types";

type SubgraphGame = {
  gameId?: string;
  state?: string;
  status?: string;
  conditions?: AzuroConditionLike[];
};

async function subgraphFetch(gameIds: string[]): Promise<SubgraphGame[]> {
  const url = getAzuroGraphqlEndpoint();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query CheckResolved($gameIds: [String!]!) {
          games(where: { gameId_in: $gameIds }) {
            gameId
            state
            conditions {
              conditionId
              state
              wonOutcomeIds
              outcomes { outcomeId currentOdds }
            }
          }
        }
      `,
      variables: { gameIds },
    }),
  });
  const json = (await res.json()) as { data?: { games?: SubgraphGame[] }; errors?: unknown };
  if (!res.ok || json.errors) {
    throw new Error(`Subgraph error: ${JSON.stringify(json.errors ?? res.status).slice(0, 200)}`);
  }
  return json.data?.games ?? [];
}

export class AzuroLegacySubgraphProvider implements OracleProvider {
  readonly sourceId = "azuro_subgraph_legacy" as const;
  readonly deprecated = true;

  async pollGames(gameIds: string[]): Promise<OracleMarketSnapshot[]> {
    if (gameIds.length === 0) return [];
    const started = Date.now();
    const unique = [...new Set(gameIds.map((g) => g.trim()).filter(Boolean))];
    const CHUNK = 50;
    const fetchedAt = new Date().toISOString();
    const out: OracleMarketSnapshot[] = [];

    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      const games = await subgraphFetch(chunk);
      const byId = new Map(games.map((g) => [String(g.gameId), g]));
      for (const gameId of chunk) {
        const g = byId.get(gameId);
        out.push({
          gameId,
          marketId: `azuro-${gameId}`,
          gameState: g?.state ?? g?.status ?? null,
          conditions: g?.conditions ?? [],
          source: "azuro_subgraph_legacy",
          fetchedAt,
          staleAgeSec: null,
        });
      }
    }

    console.log(
      JSON.stringify({
        tag: "ORACLE_SOURCE",
        source: "azuro_subgraph_legacy",
        ORACLE_SOURCE: "azuro_subgraph_legacy",
        DEPRECATED: true,
        gameCount: out.length,
        latencyMs: Date.now() - started,
      }),
    );

    return out;
  }

  async healthCheck(): Promise<OracleProviderHealth> {
    const started = Date.now();
    try {
      await subgraphFetch(["1006000000000077352066"]);
      return {
        source: "azuro_subgraph_legacy",
        ok: true,
        latencyMs: Date.now() - started,
        deprecated: true,
      };
    } catch (e) {
      return {
        source: "azuro_subgraph_legacy",
        ok: false,
        latencyMs: Date.now() - started,
        lastError: e instanceof Error ? e.message : String(e),
        deprecated: true,
      };
    }
  }
}
