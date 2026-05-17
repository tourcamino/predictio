import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { PROTOCOL_CACHE } from "~/lib/query/protocolCachePolicy";
import type { Market } from "~/data/mockMarkets";
import type { UserOrderRow } from "~/lib/position/derivePositionLifecycle";
import { SettlementTimelinePanel } from "./SettlementTimelinePanel";
import { SettlementDiagnosticBanner } from "./SettlementDiagnosticBanner";
import { OracleTrustLayer } from "./OracleTrustLayer";

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

  const lastCheck = diagnosticQuery.data?.checkedAt
    ? new Date(diagnosticQuery.data.checkedAt)
    : null;

  return (
    <div className="space-y-4">
      <OracleTrustLayer marketId={marketId} />
      <SettlementDiagnosticBanner marketId={marketId} />
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
