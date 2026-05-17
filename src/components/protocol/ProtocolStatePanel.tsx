import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, Radio } from "lucide-react";

type Variant = "loading" | "error" | "empty" | "oracle" | "neutral";

const variantStyles: Record<
  Variant,
  { shell: string; icon: string; title: string; message: string }
> = {
  loading: {
    shell:
      "border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02]",
    icon: "text-brand-cyan",
    title: "text-white",
    message: "text-gray-400",
  },
  error: {
    shell:
      "border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent",
    icon: "text-red-400",
    title: "text-red-100",
    message: "text-red-200/80",
  },
  empty: {
    shell:
      "border-white/10 bg-gradient-to-br from-white/[0.05] to-brand-bg",
    icon: "text-gray-500",
    title: "text-gray-200",
    message: "text-gray-500",
  },
  oracle: {
    shell:
      "border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent",
    icon: "text-amber-400",
    title: "text-amber-100",
    message: "text-amber-200/80",
  },
  neutral: {
    shell:
      "border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02]",
    icon: "text-brand-green",
    title: "text-white",
    message: "text-gray-400",
  },
};

export function ProtocolStatePanel({
  variant,
  title,
  message,
  icon,
  action,
  compact,
}: {
  variant: Variant;
  title: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  const s = variantStyles[variant];
  const defaultIcon =
    variant === "loading" ? (
      <Loader2 className={`h-8 w-8 animate-spin ${s.icon}`} />
    ) : variant === "error" ? (
      <AlertTriangle className={`h-8 w-8 ${s.icon}`} />
    ) : variant === "oracle" ? (
      <AlertTriangle className={`h-8 w-8 ${s.icon}`} />
    ) : variant === "empty" ? (
      <Inbox className={`h-8 w-8 ${s.icon}`} />
    ) : (
      <Radio className={`h-8 w-8 ${s.icon}`} />
    );

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border shadow-[0_16px_48px_rgba(0,0,0,0.35)] ${s.shell} ${
        compact ? "p-8" : "p-12"
      } text-center`}
      role="status"
    >
      {variant === "oracle" && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400/80 to-amber-600/20"
          aria-hidden
        />
      )}
      <div className="relative flex flex-col items-center gap-3">
        {icon ?? defaultIcon}
        <p className={`font-syne text-lg font-bold ${s.title}`}>{title}</p>
        {message ? <p className={`max-w-md text-sm ${s.message}`}>{message}</p> : null}
        {action}
      </div>
    </div>
  );
}
