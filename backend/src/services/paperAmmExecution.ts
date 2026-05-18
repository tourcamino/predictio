import type { Prisma, PrismaClient } from "@prisma/client";
import {
  DEFAULT_PAPER_POOL_USDC,
  initAmmState,
  mergeOracleIntoExistingOutcomes,
  previewBuyFill,
  pricesFromOutcomes,
  serializeAmmOutcomes,
  softReanchorToOracle,
  computeSpot,
  type PaperAmmSide,
  type PaperAmmState,
} from "./paperAmmEngine";
import { resolveCanonicalLiquidityState } from "./canonicalLiquidityState";

export type PaperAmmFillResult = {
  shares: number;
  avgPrice: number;
  priceImpact: number;
  newOutcomes: Prisma.InputJsonValue;
  postYesPrice: number;
  postNoPrice: number;
  postDrawPrice: number | null;
};

let poolCache: { at: number; byId: Record<string, number> } | null = null;
const POOL_CACHE_MS = 30_000;

export async function poolLiquidityByMarketId(
  prisma: PrismaClient,
  marketId: string,
): Promise<number> {
  const now = Date.now();
  if (!poolCache || now - poolCache.at > POOL_CACHE_MS) {
    const state = await resolveCanonicalLiquidityState(prisma);
    const byId: Record<string, number> = {};
    for (const row of state.liquidityPerMarket) {
      byId[row.marketId] = row.allocation;
    }
    poolCache = { at: now, byId };
  }
  return poolCache.byId[marketId] ?? DEFAULT_PAPER_POOL_USDC;
}

export async function getOpenInterestUsd(
  prisma: PrismaClient,
  marketId: string,
): Promise<number> {
  const agg = await prisma.order.aggregate({
    where: { marketId, status: "open" },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

async function resolveAmmStateForMarket(
  prisma: PrismaClient,
  marketId: string,
  oracleYes: number,
  oracleNo: number,
  existingOutcomes: unknown,
  oracleDraw?: number | null,
): Promise<PaperAmmState> {
  const poolUsd = await poolLiquidityByMarketId(prisma, marketId);
  const { ammState } = pricesFromOutcomes(
    existingOutcomes,
    { yes: oracleYes, no: oracleNo, draw: oracleDraw },
    poolUsd,
  );
  if (ammState) {
    return softReanchorToOracle(ammState, oracleYes, oracleNo, oracleDraw);
  }
  return initAmmState(oracleYes, oracleNo, poolUsd, oracleDraw);
}

export async function executePaperAmmMarketBuy(
  prisma: PrismaClient,
  input: {
    marketId: string;
    side: PaperAmmSide;
    amountUsd: number;
    oracleYes: number;
    oracleNo: number;
    oracleDraw?: number | null;
    existingOutcomes: unknown;
  },
): Promise<PaperAmmFillResult> {
  const openInterest = await getOpenInterestUsd(prisma, input.marketId);
  const state = await resolveAmmStateForMarket(
    prisma,
    input.marketId,
    input.oracleYes,
    input.oracleNo,
    input.existingOutcomes,
    input.oracleDraw,
  );
  const fill = previewBuyFill(state, input.side, input.amountUsd, openInterest);
  const serialized = serializeAmmOutcomes(fill.newState, fill.postSpot);

  return {
    shares: fill.shares,
    avgPrice: fill.avgPrice,
    priceImpact: fill.priceImpact,
    newOutcomes: serialized as Prisma.InputJsonValue,
    postYesPrice: fill.postSpot.yesPrice,
    postNoPrice: fill.postSpot.noPrice,
    postDrawPrice: fill.postSpot.drawPrice,
  };
}

export async function persistAmmOutcomesAfterFill(
  prisma: PrismaClient,
  marketId: string,
  newOutcomes: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.market.update({
    where: { id: marketId },
    data: { outcomes: newOutcomes },
  });
}

export function mergeOracleSnapshotIntoOutcomes(
  existingOutcomes: unknown,
  oracleYes: number,
  oracleNo: number,
  poolUsd: number,
  oracleDraw?: number | null,
): Prisma.InputJsonValue {
  return mergeOracleIntoExistingOutcomes(
    existingOutcomes,
    oracleYes,
    oracleNo,
    poolUsd,
    oracleDraw,
  ) as Prisma.InputJsonValue;
}
