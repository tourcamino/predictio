import { useEffect, useRef } from "react";
import { resetStaleScrollLocksIfIdle } from "~/lib/bodyScrollLock";
import { useWalletRuntimeState } from "~/hooks/useWalletRuntimeState";

/** Clears stale body overflow when wallet runtime returns to a non-actionable state. */
export function WalletRuntimeScrollCleanup() {
  const { runtime } = useWalletRuntimeState();
  const prev = useRef(runtime);

  useEffect(() => {
    if (prev.current !== runtime && (runtime === "hydrating" || runtime === "disconnected")) {
      resetStaleScrollLocksIfIdle();
    }
    prev.current = runtime;
  }, [runtime]);

  return null;
}
