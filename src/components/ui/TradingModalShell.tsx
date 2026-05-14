import { type ReactNode } from "react";
import { X } from "lucide-react";
import { useBodyScrollLock } from "~/hooks/useBodyScrollLock";

type TradingModalShellProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** `md` ≈ share cards; `lg` slightly wider */
  size?: "md" | "lg";
};

export function TradingModalShell({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
}: TradingModalShellProps) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const maxW = size === "lg" ? "max-w-xl" : "max-w-md";
  const maxH = size === "lg" ? "max-h-[min(90vh,720px)]" : "max-h-[min(88vh,640px)]";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trading-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/75 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex w-full ${maxW} ${maxH} flex-col overflow-hidden rounded-2xl border border-white/10 bg-brand-bg shadow-2xl shadow-black/40`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0 pr-2">
            <h2
              id="trading-modal-title"
              className="font-syne text-lg font-bold text-white sm:text-xl"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
