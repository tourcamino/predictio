import { priceMovementLabel } from "~/lib/market/marketProtocolStatus";

/** Real entry → current probability bar (no synthetic tape). */
export function ProbabilityDepthBar({
  entry,
  current,
  side,
  className = "",
}: {
  entry: number;
  current: number;
  side: "YES" | "NO" | "DRAW";
  className?: string;
}) {
  const entryPct = Math.max(1, Math.min(99, entry * 100));
  const currentPct = Math.max(1, Math.min(99, current * 100));
  const movement = priceMovementLabel(entry, current);
  const isYes = side === "YES";
  const isDraw = side === "DRAW";
  const accent = isDraw ? "bg-brand-cyan" : isYes ? "bg-brand-green" : "bg-red-500";
  const accentText = isDraw ? "text-brand-cyan" : isYes ? "text-brand-green" : "text-red-400";

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-gray-500">
        <span className={accentText}>{side}</span>
        <span className="text-gray-500">{movement.label}</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute top-0 bottom-0 w-px bg-white/40"
          style={{ left: `${entryPct}%` }}
          title={`Entry ${entryPct.toFixed(0)}¢`}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${accent} opacity-90 transition-all duration-500`}
          style={{ width: `${currentPct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-gray-500">
        <span>entry {entryPct.toFixed(0)}¢</span>
        <span className={accentText}>now {currentPct.toFixed(0)}¢</span>
      </div>
    </div>
  );
}
