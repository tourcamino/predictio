import { Check, Circle, Loader2 } from "lucide-react";
import type { PipelineStep } from "~/lib/protocol/positionLifecycleNarrative";

export function PositionLifecyclePipeline({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5">
      <p className="mb-4 text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
        Position lifecycle
      </p>
      <ol className="space-y-0">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          return (
            <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast && (
                <span
                  className="absolute left-[11px] top-6 bottom-0 w-px bg-gradient-to-b from-white/20 to-transparent"
                  aria-hidden
                />
              )}
              <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-brand-bg">
                {s.status === "done" ? (
                  <Check className="h-3.5 w-3.5 text-brand-green" />
                ) : s.status === "active" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                ) : (
                  <Circle className="h-2 w-2 text-gray-600" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    s.status === "active"
                      ? "text-amber-100"
                      : s.status === "done"
                        ? "text-white"
                        : "text-gray-500"
                  }`}
                >
                  {s.label}
                </p>
                {s.detail ? <p className="mt-0.5 text-xs text-gray-500">{s.detail}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
