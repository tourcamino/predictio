import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { PROTOCOL_CACHE } from "~/lib/query/protocolCachePolicy";
import type { Market } from "~/data/mockMarkets";
import type { UserOrderRow } from "~/lib/position/derivePositionLifecycle";
import { SettlementTimelinePanel } from "./SettlementTimelinePanel";
import { SettlementDiagnosticBanner } from "./SettlementDiagnosticBanner";
import { OracleTrustLayer } from "./OracleTrustLayer";
import { ProtocolWhyStillOpen } from "./ProtocolWhyStillOpen";
import { MarketPulseStrip } from "./MarketPulseStrip";
import { OracleLagStatusPanel } from "./OracleLagStatusPanel";
import { deriveOracleActionContext } from "~/lib/protocol/deriveOracleActionContext";

/** Fetches live oracle diagnostic and renders settlement timeline + banner. */
export function SettlementTimelineSection({
  marketId,
  market,
  order,
  compact,
}: {
  marketId: string;
  market?: Market | null;
  order?: UserOrderRow | null;
  compact?: boolean;
}) {
  const trpc = useTRPC();
  const diagnosticQuery = useQuery({
    ...trpc.getMarketSettlementDiagnostic.queryOptions({ marketId }),
    staleTime: PROTOCOL_CACHE.settlementDiagnosticStaleMs,
    refetchInterval: PROTOCOL_CACHE.settlementDiagnosticRefetchMs,
    enabled: Boolean(marketId),
  });

  const healthQuery = useQuery({
    ...trpc.getSettlementProtocolHealth.queryOptions({ sampleLimit: 20 }),
    staleTime: PROTOCOL_CACHE.settlementDiagnosticStaleMs,
    enabled: Boolean(marketId) && order?.status === "open",
  });

  const actionCtx = deriveOracleActionContext({
    diagnostic: diagnosticQuery.data?.diagnostic,
    confidence: diagnosticQuery.data?.confidence,
    oracleTrust: diagnosticQuery.data?.oracleTrust,
    protocolHealth: healthQuery.data
      ? {
          openOrders: healthQuery.data.openOrders,
          openMarkets: healthQuery.data.openMarkets,
          unresolvedMarkets: healthQuery.data.unresolvedMarkets,
          lastSettlementTickAt: healthQuery.data.lastSettlementTickAt,
        }
      : null,
    orderOpen: order?.status === "open",
  });

  const lastCheck = diagnosticQuery.data?.checkedAt
    ? new Date(diagnosticQuery.data.checkedAt)
    : null;

  return (
    <div className="space-y-4">
      <OracleTrustLayer marketId={marketId} />
      <OracleLagStatusPanel
        reasonCode={diagnosticQuery.data?.diagnostic?.reasonCode}
        lastOracleSyncAt={diagnosticQuery.data?.checkedAt}
        lastSettlementTickAt={healthQuery.data?.lastSettlementTickAt}
        orderOpen={order?.status === "open"}
        cronCadence={healthQuery.data?.cronCadence}
      />
      <SettlementDiagnosticBanner marketId={marketId} />
      {order?.status === "open" ? <ProtocolWhyStillOpen ctx={actionCtx} /> : null}
      {market ? (
        <MarketPulseStrip
          market={market}
          marketId={marketId}
          diagnostic={diagnosticQuery.data?.diagnostic}
          oracleCheckedAt={diagnosticQuery.data?.checkedAt}
        />
      ) : null}
      <SettlementTimelinePanel
        market={market}
        order={order}
        diagnostic={diagnosticQuery.data?.diagnostic}
        lastOracleCheckAt={lastCheck}
        compact={compact}
      />
    </div>
  );
}
