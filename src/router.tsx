import type { ErrorComponentProps } from "@tanstack/react-router";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./generated/tanstack-router/routeTree.gen";

export function RouterPendingShell() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080B11",
        color: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      Caricamento Predictio…
    </div>
  );
}

function RouterErrorShell({ error, reset }: ErrorComponentProps) {
  const msg =
    error instanceof Error ? error.message : String(error ?? "Errore sconosciuto");
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080B11",
        color: "#fecaca",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "1rem" }}>
        Errore nel caricamento
      </h1>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontSize: "13px",
          marginBottom: "1rem",
          maxWidth: "48rem",
        }}
      >
        {msg}
      </pre>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          padding: "0.5rem 1rem",
          background: "#00FF87",
          color: "#080B11",
          border: "none",
          borderRadius: "8px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Riprova
      </button>
    </div>
  );
}

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPendingComponent: RouterPendingShell,
    defaultErrorComponent: RouterErrorShell,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
