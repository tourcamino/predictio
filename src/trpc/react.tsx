import { QueryClientProvider } from "@tanstack/react-query";
import {
  loggerLink,
  splitLink,
  httpBatchLink,
  httpSubscriptionLink,
  createTRPCClient,
  type Operation,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState } from "react";
import SuperJSON from "superjson";

import { AppRouter } from "~/server/trpc/root";
import { getQueryClient } from "./query-client";
import { isLocalFrontendDevOrigin } from "~/lib/predictioApi";

// Now, with the newer @trpc/tanstack-react-query package, we no longer need createTRPCReact.
// We use createTRPCContext instead.
const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export { useTRPC, useTRPCClient };

/**
 * tRPC HTTP batch URL origin. Prefer `VITE_API_URL` when the UI is hosted separately
 * from the API (avoids fetching `/trpc` and receiving SPA HTML). In the browser,
 * default is same-origin. SSR fallback matches Vinxi dev (`VITE_APP_URL` / port 5173).
 *
 * Local dev exception: `VITE_API_URL` is also used by the REST helper to point at the
 * Express backend (default `http://127.0.0.1:3001`), but Express does not host `/trpc`.
 * When the SPA is running on a localhost dev port (Vinxi serves `/trpc` same-origin),
 * ignore a cross-origin `VITE_API_URL` and use the current origin instead.
 */
function getBaseUrl() {
  const viteApi = import.meta.env.VITE_API_URL as string | undefined;
  const apiTrimmed = viteApi?.trim().replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    if (apiTrimmed && apiTrimmed !== origin && isLocalFrontendDevOrigin()) {
      return origin;
    }
    if (apiTrimmed) return apiTrimmed;
    return origin;
  }
  const appTrimmed = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  if (appTrimmed) return appTrimmed.replace(/\/$/, "");
  return "http://127.0.0.1:5173";
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          // Verbose request logging in dev noticeably slows the UI; log failures only.
          enabled: (opts) =>
            opts.direction === "down" && opts.result instanceof Error,
        }),
        splitLink({
          condition: (op: Operation) => op.type === "subscription",
          // Non-streaming batch: avoids "Stream closed" when proxies, SSR, or slow
          // Azuro payloads interrupt httpBatchStreamLink's chunked response.
          false: httpBatchLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/trpc",
            maxURLLength: Infinity,
          }),
          true: httpSubscriptionLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/trpc",
          }),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
