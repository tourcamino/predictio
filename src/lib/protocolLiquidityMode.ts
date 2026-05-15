/**
 * Protocol liquidity display mode — pre-testnet paper routing vs Base testnet with visible USDC.
 */

export type ProtocolLiquidityMode = "PRE_TESTNET" | "TESTNET";

export const DEFAULT_SIMULATED_LIQUIDITY_USDC = 10_000;

export type ProtocolLiquidityConfig = {
  mode: ProtocolLiquidityMode;
  /** Simulated routing pool split across OPEN curated markets (not on-chain TVL). */
  simulatedLiquidityUsdc: number;
  showDollarLiquidity: boolean;
  showSimulatedApyProjections: boolean;
  showExternalLpAsReal: boolean;
};

function parseMode(raw: string | undefined): ProtocolLiquidityMode {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "TESTNET") return "TESTNET";
  return "PRE_TESTNET";
}

function parseSimulatedUsdc(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SIMULATED_LIQUIDITY_USDC;
  return Math.round(n);
}

/** Server / build-time config (Node env). */
export function getProtocolLiquidityConfigFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): ProtocolLiquidityConfig {
  const mode = parseMode(
    env.PREDICTIO_PROTOCOL_MODE ?? env.VITE_PREDICTIO_PROTOCOL_MODE,
  );
  const simulatedLiquidityUsdc = parseSimulatedUsdc(
    env.PREDICTIO_SIMULATED_LIQUIDITY_USDC ?? env.VITE_PREDICTIO_SIMULATED_LIQUIDITY_USDC,
  );
  const isTestnet = mode === "TESTNET";
  return {
    mode,
    simulatedLiquidityUsdc,
    showDollarLiquidity: isTestnet,
    showSimulatedApyProjections: isTestnet,
    showExternalLpAsReal: isTestnet,
  };
}

/** Browser config (Vite). */
export function getProtocolLiquidityConfigClient(): ProtocolLiquidityConfig {
  const mode = parseMode(import.meta.env.VITE_PREDICTIO_PROTOCOL_MODE as string | undefined);
  const simulatedLiquidityUsdc = parseSimulatedUsdc(
    import.meta.env.VITE_PREDICTIO_SIMULATED_LIQUIDITY_USDC as string | undefined,
  );
  const isTestnet = mode === "TESTNET";
  return {
    mode,
    simulatedLiquidityUsdc,
    showDollarLiquidity: isTestnet,
    showSimulatedApyProjections: isTestnet,
    showExternalLpAsReal: isTestnet,
  };
}

export function isPreTestnetLiquidityMode(config: ProtocolLiquidityConfig): boolean {
  return config.mode === "PRE_TESTNET";
}

export const PRE_TESTNET_LIQUIDITY_HEADLINE =
  "Pre-testnet paper liquidity environment";

export const PRE_TESTNET_LIQUIDITY_SUBLINE =
  "Paper liquidity allocation adapts dynamically to curated markets — one simulated routing budget, not on-chain TVL or LP capital.";

export const PRE_TESTNET_ALLOCATION_EXPLAINER =
  "Paper liquidity allocation adapts dynamically to curated markets. A single simulated budget is split across OPEN slots by editorial appeal (or paper volume when live), with min/max caps per market.";

export const CURATED_MARKET_ROUTING_LABEL = "Adaptive paper liquidity routing";
