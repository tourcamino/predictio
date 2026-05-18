import type { Prisma } from "@prisma/client";
import { db } from "~/server/db";
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
} from "~/lib/amm/paperAmmEngine";
import { resolveCanonicalLiquidityState } from "~/server/services/canonicalLiquidityState";
import { parseYesNoPrices } from "~/server/utils/prismaMarket";

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

async function poolLiquidityByMarketId(marketId: string): Promise<number> {
  const now = Date.now();
  if (!poolCache || now - poolCache.at > POOL_CACHE_MS) {
    const state = await resolveCanonicalLiquidityState();
    const byId: Record<string, number> = {};
    for (const row of state.liquidityPerMarket) {
      byId[row.marketId] = row.allocation;
    }
    poolCache = { at: now, byId };
  }
  return poolCache.byId[marketId] ?? DEFAULT_PAPER_POOL_USDC;
}

export async function getOpenInterestUsd(marketId: string): Promise<number> {
  const agg = await db.order.aggregate({
    where: { marketId, status: "open" },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

export async function resolveAmmStateForMarket(
  marketId: string,
  oracleYes: number,
  oracleNo: number,
  existingOutcomes: unknown,
  oracleDraw?: number | null,
): Promise<PaperAmmState> {
  const poolUsd = await poolLiquidityByMarketId(marketId);
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

export async function executePaperAmmMarketBuy(input: {
  marketId: string;
  side: PaperAmmSide;
  amountUsd: number;
  oracleYes: number;
  oracleNo: number;
  oracleDraw?: number | null;
  existingOutcomes: unknown;
}): Promise<PaperAmmFillResult> {
  const openInterest = await getOpenInterestUsd(input.marketId);
  const state = await resolveAmmStateForMarket(
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
  marketId: string,
  newOutcomes: Prisma.InputJsonValue,
): Promise<void> {
  await db.market.update({
    where: { id: marketId },
    data: { outcomes: newOutcomes },
  });
}

/** Merge oracle refresh without wiping trader-driven reserves. */
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

export async function enrichOutcomesWithAmm(
  marketId: string,
  outcomes: unknown,
  oracleYes: number,
  oracleNo: number,
  oracleDraw?: number | null,
): Promise<{
  yesPrice: number;
  noPrice: number;
  drawPrice: number | null;
  outcomesJson: Prisma.InputJsonValue;
  spot: ReturnType<typeof computeSpot>;
  poolLiquidityUsd: number;
}> {
  const poolUsd = await poolLiquidityByMarketId(marketId);
  const merged = mergeOracleIntoExistingOutcomes(
    outcomes,
    oracleYes,
    oracleNo,
    poolUsd,
    oracleDraw,
  );
  const openInterest = await getOpenInterestUsd(marketId);
  const state = await resolveAmmStateForMarket(
    marketId,
    oracleYes,
    oracleNo,
    merged,
    oracleDraw,
  );
  const spot = computeSpot(state, openInterest);
  const serialized = serializeAmmOutcomes(state, spot);
  return {
    yesPrice: spot.yesPrice,
    noPrice: spot.noPrice,
    drawPrice: spot.drawPrice,
    outcomesJson: serialized as Prisma.InputJsonValue,
    spot,
    poolLiquidityUsd: poolUsd,
  };
}

export { parseYesNoPrices, poolLiquidityByMarketId };
