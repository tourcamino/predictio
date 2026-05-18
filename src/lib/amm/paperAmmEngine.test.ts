import {
  initAmmState,
  previewBuyFill,
  parseAmmStateFromOutcomes,
  type PaperAmmSide,
} from "~/lib/amm/paperAmmEngine";
import assert from "node:assert/strict";

function testYesBuyMovesMarketUp() {
  const state = initAmmState(0.5, 0.5, 10_000);
  const fill = previewBuyFill(state, "YES", 200);
  assert(fill.postSpot.yesPrice > 0.5, "YES price should rise after YES buys");
  assert(fill.postSpot.noPrice < 0.5, "NO price should fall after YES buys");
  assert(fill.priceImpact > 0, "Should have positive price impact");
  assert(fill.shares > 0, "Should receive shares");
}

function testRepeatedBuysCompressPayout() {
  let state = initAmmState(0.45, 0.55, 8_000);
  const first = previewBuyFill(state, "YES", 100);
  const second = previewBuyFill(first.newState, "YES", 100);
  assert(second.avgPrice > first.avgPrice, "Second YES buy should pay higher avg price");
}

function testUtilizationInSpot() {
  const state = initAmmState(0.5, 0.5, 5_000);
  const spot = previewBuyFill(state, "NO", 50, 2_000).postSpot;
  assert(spot.utilizationPct > 0, "Utilization should reflect open interest");
}

function testNoFakeDriftWithoutTrades() {
  const state = initAmmState(0.6, 0.4, 12_000);
  const spot1 = previewBuyFill(state, "YES", 0.01).postSpot;
  const spot2 = previewBuyFill(state, "YES", 0.01).postSpot;
  assert(spot1.yesPrice === spot2.yesPrice, "Tiny preview should not mutate stored state");
}

function testSerializeRoundTrip() {
  const state = initAmmState(0.52, 0.48, 10_000);
  const fill = previewBuyFill(state, "YES", 150);
  const parsed = parseAmmStateFromOutcomes(
    {
      v: 1,
      yes: { price: fill.postSpot.yesPrice, reserve: fill.newState.yesReserve },
      no: { price: fill.postSpot.noPrice, reserve: fill.newState.noReserve },
      amm: {
        poolLiquidityUsd: 10_000,
        oracleYes: 0.52,
        oracleNo: 0.48,
        flowYesUsd: 150,
        flowNoUsd: 0,
        flowDrawUsd: 0,
      },
    },
    { yes: 0.52, no: 0.48 },
    10_000,
  );
  assert(parsed != null, "Should parse v1 outcomes");
  assert(parsed.flowYesUsd === 150, "Flow should round-trip");
}

testYesBuyMovesMarketUp();
testRepeatedBuysCompressPayout();
testUtilizationInSpot();
testNoFakeDriftWithoutTrades();
testSerializeRoundTrip();

console.log("paperAmmEngine tests passed");
