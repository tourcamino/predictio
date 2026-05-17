import { AlertTriangle, Info } from "lucide-react";
import type { UserOrderRow } from "~/lib/position/derivePositionLifecycle";
import { countAwaitingOracleSettlement } from "~/lib/position/derivePositionLifecycle";
import type { Market } from "~/data/mockMarkets";

export function SettlementOracleBanner({
  positions,
  marketById,
}: {
  positions: UserOrderRow[];
  marketById: Record<string, Market | null | undefined>;
}) {
  const count = countAwaitingOracleSettlement(positions, marketById);
  if (count === 0) return null;

  return (
    <div
      className="mb-6 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex gap-3"
      role="status"
    >
      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="font-semibold text-amber-100">
          {count} position{count === 1 ? "" : "s"} — market finished, awaiting oracle settlement
        </p>
        <p className="text-sm text-amber-200/80 mt-1">
          The match has ended on our schedule. Payouts post after the external oracle (Azuro) reports a
          final result. This is not a wallet or balance issue.
        </p>
        <p
          className="text-xs text-gray-400 mt-2 flex items-start gap-1"
          title="Resolution uses Azuro GraphQL. Until the game state is Resolved/Finished with a winning outcome, orders stay open in paper mode."
        >
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Oracle resolution can lag real-world kickoff. Settlement runs automatically every few minutes.
        </p>
      </div>
    </div>
  );
}
