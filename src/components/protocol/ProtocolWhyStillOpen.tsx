import { HelpCircle } from "lucide-react";
import type { OracleActionContext } from "~/lib/protocol/deriveOracleActionContext";
import { formatApiDateTime } from "~/utils/parseApiDate";

export function ProtocolWhyStillOpen({ ctx }: { ctx: OracleActionContext }) {
  if (!ctx.whyStillOpen && !ctx.expectedNextAction) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent px-4 py-3">
      <div className="flex gap-3">
        <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div className="min-w-0 space-y-2 text-sm">
          {ctx.whyStillOpen ? (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber-200/80">
                Why still open?
              </p>
              <p className="text-gray-200">{ctx.whyStillOpen}</p>
            </div>
          ) : null}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
              Expected next protocol action
            </p>
            <p className="text-gray-400">{ctx.expectedNextAction}</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-gray-600">
            <span className="uppercase text-gray-500">
              Confidence {ctx.confidenceLevel}
            </span>
            {ctx.oracleLastSeen ? (
              <span>Oracle last seen {formatApiDateTime(new Date(ctx.oracleLastSeen))}</span>
            ) : null}
            {ctx.settlementQueueHint ? <span>{ctx.settlementQueueHint}</span> : null}
            {ctx.estimatedDelay ? (
              <span className="text-amber-300/90">{ctx.estimatedDelay}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
