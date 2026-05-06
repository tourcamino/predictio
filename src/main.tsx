/// <reference types="vinxi/types/client" />

import "./styles.css";

import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { createRouter, RouterPendingShell } from "./router";
import { TRPCReactProvider } from "./trpc/react";
import { errorMonitor, setUser } from "./lib/errorMonitoring";
import { useWalletStore } from "./store/useWalletStore";

// Set up a Router instance
const router = createRouter();

// Initialize error monitoring
errorMonitor.init();

// Track user context when wallet changes (use store API, not the useWallet() hook)
if (typeof window !== 'undefined') {
  const updateErrorMonitoringUser = () => {
    const walletState = useWalletStore.getState();
    if (walletState.address) {
      setUser({
        wallet: walletState.address,
      });
    }
  };

  useWalletStore.subscribe(updateErrorMonitoringUser);
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Predictio: missing #root element");
}

let reactRoot: ReactDOM.Root | undefined;

function renderApp() {
  if (!reactRoot) {
    reactRoot = ReactDOM.createRoot(container!);
  }
  reactRoot.render(
    <React.StrictMode>
      <TRPCReactProvider>
        <Suspense fallback={<RouterPendingShell />}>
          <RouterProvider router={router} />
        </Suspense>
      </TRPCReactProvider>
    </React.StrictMode>,
  );
}

try {
  renderApp();
} catch (err) {
  console.error("[Predictio] Avvio fallito:", err);
  container.innerHTML = `<div style="min-height:100vh;background:#080B11;color:#fecaca;padding:2rem;font-family:system-ui"><h1 style="color:#fff">Errore di avvio</h1><pre style="white-space:pre-wrap">${String(err instanceof Error ? err.message : err)}</pre></div>`;
}
