/**
 * Backend mirror of src/lib/protocolLiquidityMode.ts (Express has no Vinxi import path).
 */

export type ProtocolLiquidityMode = "PRE_TESTNET" | "TESTNET";

export const DEFAULT_SIMULATED_LIQUIDITY_USDC = 10_000;

export type ProtocolLiquidityConfig = {
  mode: ProtocolLiquidityMode;
  simulatedLiquidityUsdc: number;
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

export function getProtocolLiquidityConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ProtocolLiquidityConfig {
  return {
    mode: parseMode(env.PREDICTIO_PROTOCOL_MODE),
    simulatedLiquidityUsdc: parseSimulatedUsdc(env.PREDICTIO_SIMULATED_LIQUIDITY_USDC),
  };
}
