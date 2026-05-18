import { isWelcomeOnboardingDismissedInStorage } from "~/components/onboarding/OnboardingModal";

const ACTIVE_TRADER_PREFIX = "predictio:active-trader:";
const ONBOARDING_RESURFACE_PREFIX = "predictio:onboarding-resurface-after:";

/** 30 days before optional resurface for users who skipped without trading. */
const RESURFACE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export function activeTraderStorageKey(walletKey: string): string {
  return `${ACTIVE_TRADER_PREFIX}${walletKey.toLowerCase()}`;
}

export function markWalletAsActiveTrader(walletKey: string): void {
  if (typeof window === "undefined" || !walletKey) return;
  try {
    localStorage.setItem(activeTraderStorageKey(walletKey), "1");
  } catch {
    /* ignore */
  }
}

export function isWalletActiveTrader(walletKey: string): boolean {
  if (typeof window === "undefined" || !walletKey) return false;
  try {
    return localStorage.getItem(activeTraderStorageKey(walletKey)) === "1";
  } catch {
    return false;
  }
}

function resurfaceAfterKey(walletKey: string): string {
  return `${ONBOARDING_RESURFACE_PREFIX}${walletKey.toLowerCase()}`;
}

/** Called when user skips onboarding — low-frequency resurface only after cooldown. */
export function scheduleOnboardingResurface(walletKey: string): void {
  if (typeof window === "undefined" || !walletKey) return;
  try {
    localStorage.setItem(
      resurfaceAfterKey(walletKey),
      String(Date.now() + RESURFACE_COOLDOWN_MS),
    );
  } catch {
    /* ignore */
  }
}

function isOnboardingResurfaceAllowed(walletKey: string): boolean {
  if (typeof window === "undefined" || !walletKey) return false;
  try {
    const raw = localStorage.getItem(resurfaceAfterKey(walletKey));
    if (!raw) return true;
    const after = Number(raw);
    return Number.isFinite(after) ? Date.now() >= after : true;
  } catch {
    return false;
  }
}

/** First-time welcome only; active / returning traders are never nagged. */
export function shouldShowWelcomeOnboarding(input: {
  walletKey: string;
  onboardingCompleted: boolean;
  isNewUser: boolean;
  openOrderCount?: number;
  tradesCount?: number;
}): boolean {
  const {
    walletKey,
    onboardingCompleted,
    isNewUser,
    openOrderCount = 0,
    tradesCount = 0,
  } = input;
  if (!walletKey) return false;
  if (onboardingCompleted) return false;
  if (isWelcomeOnboardingDismissedInStorage(walletKey)) return false;
  if (isWalletActiveTrader(walletKey)) return false;
  if (openOrderCount > 0 || tradesCount > 0) return false;
  if (!isNewUser) return false;
  return isOnboardingResurfaceAllowed(walletKey);
}

export function demoBannerDismissKey(walletKey: string | undefined): string {
  return walletKey
    ? `predictio:demo-banner-dismiss:${walletKey.toLowerCase()}`
    : "predictio:demo-banner-dismiss:guest";
}

export function isDemoBannerDismissed(walletKey: string | undefined): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(demoBannerDismissKey(walletKey)) === "1";
  } catch {
    return false;
  }
}

export function dismissDemoBanner(walletKey: string | undefined): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(demoBannerDismissKey(walletKey), "1");
  } catch {
    /* ignore */
  }
}
