import type { CSSProperties } from "react";
import toast, { type ToastOptions } from "react-hot-toast";

/** Stable toast ids — react-hot-toast replaces existing toasts with the same id (dedupe). */
export const WALLET_TOAST_IDS = {
  syncLoading: "predictio-wallet-sync",
  syncWelcome: "predictio-wallet-sync-welcome",
  syncError: "predictio-wallet-sync-error",
  networkOk: "predictio-net-ok",
  networkErr: "predictio-net-err",
  noProvider: "predictio-no-provider",
  hydratingGate: "predictio-wallet-hydrating-gate",
  wrongNetworkGate: "predictio-wrong-network-gate",
  disconnected: "predictio-wallet-disconnected",
  addressCopied: "predictio-wallet-address-copied",
} as const;

const SUCCESS_MS = 4000;
const ERROR_MS = 5800;

const baseStyle: CSSProperties = {
  borderRadius: 12,
  boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
};

/**
 * Wallet / chain UX toasts — longer reads, stable ids to avoid stacked spam.
 * Does not change trading or protocol logic.
 */
export function walletToastSuccess(
  message: string,
  options?: ToastOptions & { id?: string },
): string {
  const { id, duration, className, style: styleOpt, ...rest } = options ?? {};
  return toast.success(message, {
    ...rest,
    id,
    duration: duration ?? SUCCESS_MS,
    style: { ...baseStyle, ...((styleOpt as CSSProperties | undefined) ?? {}) },
    className: `${className ?? ""} predictio-wallet-toast predictio-wallet-toast--success`.trim(),
  });
}

export function walletToastError(
  message: string,
  options?: ToastOptions & { id?: string },
): string {
  const { id, duration, className, style: styleOpt, ...rest } = options ?? {};
  return toast.error(message, {
    ...rest,
    id,
    duration: duration ?? ERROR_MS,
    style: { ...baseStyle, ...((styleOpt as CSSProperties | undefined) ?? {}) },
    className: `${className ?? ""} predictio-wallet-toast predictio-wallet-toast--error`.trim(),
  });
}

export function walletToastLoading(
  message: string,
  options?: ToastOptions & { id?: string },
): string {
  const { id, duration, className, style: styleOpt, ...rest } = options ?? {};
  return toast.loading(message, {
    ...rest,
    id,
    duration: duration ?? Infinity,
    style: { ...baseStyle, ...((styleOpt as CSSProperties | undefined) ?? {}) },
    className: `${className ?? ""} predictio-wallet-toast predictio-wallet-toast--loading`.trim(),
  });
}

export function walletToastDismiss(toastId?: string): void {
  if (toastId) toast.dismiss(toastId);
}
