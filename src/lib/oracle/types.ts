/**
 * PR22 — Oracle abstraction layer (foundation). Never hardcode a single Azuro query again.
 */

import type { AzuroConditionLike } from "~/lib/settlement/azuroConditionSelection";

export type OracleSourceId = "azuro_rest" | "azuro_subgraph_legacy";

export type OracleMarketSnapshot = {
  gameId: string;
  marketId: string;
  gameState: string | null;
  conditions: AzuroConditionLike[];
  source: OracleSourceId;
  fetchedAt: string;
  staleAgeSec: number | null;
};

export type OracleProviderHealth = {
  source: OracleSourceId;
  ok: boolean;
  latencyMs: number;
  lastError?: string;
  deprecated?: boolean;
};

export interface OracleProvider {
  readonly sourceId: OracleSourceId;
  readonly deprecated: boolean;
  pollGames(gameIds: string[]): Promise<OracleMarketSnapshot[]>;
  healthCheck?(): Promise<OracleProviderHealth>;
}
