/**
 * Ref-counted document scroll locks so nested modals / menu / onboarding
 * do not restore overflow while another layer still expects scroll disabled.
 */

let bodyDepth = 0;
let capturedBodyOverflow = "";

let htmlDepth = 0;
let capturedHtmlOverflow = "";

const DEBUG =
  typeof window !== "undefined" &&
  typeof import.meta !== "undefined" &&
  Boolean(import.meta.env?.DEV) &&
  Boolean((window as unknown as { __PREDICTIO_SCROLL_LOCK_DEBUG?: boolean }).__PREDICTIO_SCROLL_LOCK_DEBUG);

function logScrollLock(message: string, detail: Record<string, unknown>) {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.debug(`[scroll-lock] ${message}`, detail);
}

/** Acquire a body overflow lock; call the returned release on unmount / close. */
export function pushBodyScrollLock(): () => void {
  if (typeof document === "undefined") return () => {};
  const body = document.body;
  if (bodyDepth === 0) {
    capturedBodyOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    logScrollLock("pushBody", { depthAfter: 1, captured: capturedBodyOverflow });
  }
  bodyDepth++;
  const myDepth = bodyDepth;
  return () => {
    bodyDepth = Math.max(0, bodyDepth - 1);
    logScrollLock("releaseBody", { was: myDepth, now: bodyDepth });
    if (bodyDepth === 0) {
      body.style.overflow = capturedBodyOverflow;
    }
  };
}

/** Acquire an html overflow lock (use with body lock for full-viewport modals). */
export function pushHtmlScrollLock(): () => void {
  if (typeof document === "undefined") return () => {};
  const html = document.documentElement;
  if (htmlDepth === 0) {
    capturedHtmlOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    logScrollLock("pushHtml", { depthAfter: 1, captured: capturedHtmlOverflow });
  }
  htmlDepth++;
  const myDepth = htmlDepth;
  return () => {
    htmlDepth = Math.max(0, htmlDepth - 1);
    logScrollLock("releaseHtml", { was: myDepth, now: htmlDepth });
    if (htmlDepth === 0) {
      html.style.overflow = capturedHtmlOverflow;
    }
  };
}

/**
 * Fail-safe: clear inline overflow on html/body and reset counters.
 * Use after route changes if a modal failed to unmount cleanly.
 */
export function resetAllScrollLocks(): void {
  if (typeof document === "undefined") return;
  bodyDepth = 0;
  htmlDepth = 0;
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
  logScrollLock("resetAll", {});
}

/**
 * If no ref-counted lock is active, clear inline overflow on html/body.
 * Safe on route changes while a modal from this module still holds a lock.
 */
export function resetStaleScrollLocksIfIdle(): void {
  if (typeof document === "undefined") return;
  if (bodyDepth !== 0 || htmlDepth !== 0) return;
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
  logScrollLock("resetStaleIfIdle", {});
}
