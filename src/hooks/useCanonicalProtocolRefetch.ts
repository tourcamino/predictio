import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { refetchCanonicalPositionReads } from "~/utils/refetchCanonicalPositionReads";

/** Refetch canonical wallet reads on tab focus / reconnect (PR8–PR9). */
export function useCanonicalProtocolRefetch(
  walletKey: string | undefined,
  options?: { onReconnect?: boolean },
) {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  useEffect(() => {
    if (!walletKey) return;

    const refresh = () => {
      refetchCanonicalPositionReads(queryClient, trpc, walletKey);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    if (options?.onReconnect !== false) {
      window.addEventListener("online", refresh);
    }
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", refresh);
    };
  }, [walletKey, queryClient, trpc, options?.onReconnect]);
}
