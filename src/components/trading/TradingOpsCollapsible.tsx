import { useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import type { Market } from "~/data/mockMarkets";
import type { UserOrderRow } from "~/lib/trading/mapDbOrderToTradingPosition";
import { ProtocolAliveStrip } from "~/components/protocol/ProtocolAliveStrip";
import { SettlementOracleBanner } from "~/components/protocol/SettlementOracleBanner";
import { ProtocolSettlementHealthBar } from "~/components/protocol/ProtocolSettlementHealthBar";
import { PositionLifecycleBoard } from "~/components/positions/PositionLifecycleBoard";
import { ProtocolSurfaceWayfinder } from "~/components/protocol/ProtocolSurfaceWayfinder";

export function TradingOpsCollapsible({
  openOrders,
  marketById,
  lifecycleTailOrders,
}: {
  openOrders: UserOrderRow[];
  marketById: Record<string, Market | null | undefined>;
  lifecycleTailOrders: UserOrderRow[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-10 border-t border-white/10 pt-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/20"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-300">
          <Settings2 className="h-4 w-4 text-gray-500" />
          Protocol & settlement ops
        </span>
        <ChevronDown
          className={`h-5 w-5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="mt-4 space-y-4">
          <ProtocolAliveStrip />
          <SettlementOracleBanner positions={openOrders} marketById={marketById} />
          <ProtocolSettlementHealthBar />
          {lifecycleTailOrders.length > 0 ? (
            <PositionLifecycleBoard
              positions={lifecycleTailOrders}
              marketById={marketById}
              premium
              hideCanonicalHelp
            />
          ) : null}
          <ProtocolSurfaceWayfinder current="/trading" />
        </div>
      ) : null}
    </div>
  );
}
