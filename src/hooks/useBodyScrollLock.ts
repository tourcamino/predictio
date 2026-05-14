import { useEffect } from "react";

import { pushBodyScrollLock } from "~/lib/bodyScrollLock";

/** Lock document scroll while a modal is open (pairs with fixed overlay modals). */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const release = pushBodyScrollLock();
    return release;
  }, [locked]);
}
