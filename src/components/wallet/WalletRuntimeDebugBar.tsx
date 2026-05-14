import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useWalletRuntimeState } from "~/hooks/useWalletRuntimeState";
import { useWalletStore } from "~/store/useWalletStore";
import { getScrollLockDepths } from "~/lib/bodyScrollLock";
import { clientChainScopeForTrpc, normalizeWalletForQuery } from "~/utils/walletQuery";
import { RealtimeMarketDebugBar } from "./RealtimeMarketDebugBar";
import { usePaperWalletBalance } from "~/hooks/usePaperWalletBalance";

/** Dev-only overlay: `VITE_WALLET_RUNTIME_DEBUG=1` and/or `VITE_REALTIME_PNL_DEBUG=1`. */
export function WalletRuntimeDebugBar() {
  if (!import.meta.env.DEV) return null;
  const walletDbg = import.meta.env.VITE_WALLET_RUNTIME_DEBUG === "1";
  const rtDbg = import.meta.env.VITE_REALTIME_PNL_DEBUG === "1";
  if (!walletDbg && !rtDbg) return null;
  return (
    <>
      {walletDbg ? <WalletRuntimeDebugBarInner /> : null}
      {rtDbg ? <RealtimeMarketDebugBar /> : null}
    </>
  );
}

function WalletRuntimeDebugBarInner() {
  const snap = useWalletRuntimeState();
  const wrongNetwork = useWalletStore((s) => s.wrongNetwork);
  const address = useWalletStore((s) => s.address);
  const chainId = useWalletStore((s) => s.chainId);
  const depths = typeof document !== "undefined" ? getScrollLockDepths() : { body: 0, html: 0 };
  const bodyOverflow =
    typeof document !== "undefined" ? document.body.style.overflow || "(unset)" : "";

  const trpc = useTRPC();
  const walletKey = normalizeWalletForQuery(address);
  const chainScope = clientChainScopeForTrpc(chainId);
  const openQ = useQuery({
    ...trpc.getUserPositions.queryOptions({
      walletAddress: walletKey,
      status: "open",
      clientChainId: chainScope,
    }),
    enabled: !!walletKey,
  });
  const allQ = useQuery({
    ...trpc.getUserPositions.queryOptions({
      walletAddress: walletKey,
      status: "all",
      clientChainId: chainScope,
    }),
    enabled: !!walletKey,
  });

  const openKey = trpc.getUserPositions.queryKey({
    walletAddress: walletKey,
    status: "open",
    clientChainId: chainScope,
  });

  const { cashUsdc, dataUpdatedAt: paperBalUpdatedAt, isFetching: paperBalFetching } =
    usePaperWalletBalance();

  return (
    <div className="pointer-events-none fixed bottom-2 left-2 z-[20000] max-w-[min(100vw-1rem,28rem)] rounded border border-amber-500/40 bg-black/85 px-2 py-1.5 font-mono text-[10px] leading-snug text-amber-100 shadow-lg">
      <div>runtime: {snap.runtime}</div>
      <div>
        persistHydrated: {String(snap.persistHydrated)} syncDone:{" "}
        {String(snap.walletProviderSyncComplete)}
      </div>
      <div>
        chainId: {snap.chainId ?? "null"} expected: {snap.expectedChainId} storeWrongNet:{" "}
        {String(wrongNetwork)}
      </div>
      <div className="truncate" title={walletKey || ""}>
        wallet src: store address={address ?? "null"} norm={walletKey || "∅"} chainScope={chainScope}
      </div>
      <div>
        orders(open/all): {openQ.data?.positions.length ?? "—"} / {allQ.data?.positions.length ?? "—"}{" "}
        fetchStatus: {openQ.fetchStatus} updatedAt:{" "}
        {openQ.dataUpdatedAt ? new Date(openQ.dataUpdatedAt).toLocaleTimeString() : "—"}
      </div>
      <div>
        paper cash (tRPC): {walletKey ? `$${cashUsdc.toFixed(2)}` : "—"}{" "}
        {paperBalFetching ? "(fetching)" : ""} updatedAt:{" "}
        {paperBalUpdatedAt ? new Date(paperBalUpdatedAt).toLocaleTimeString() : "—"}
      </div>
      <div className="break-all opacity-90">qKey: {JSON.stringify(openKey)}</div>
      <div>
        scrollLock depth body={depths.body} html={depths.html} bodyOverflow={bodyOverflow}
      </div>
    </div>
  );
}
