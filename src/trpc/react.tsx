import { QueryClientProvider } from "@tanstack/react-query";
import {
  loggerLink,
  splitLink,
  httpBatchStreamLink,
  httpSubscriptionLink,
  createTRPCClient,
  type Operation,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState } from "react";
import SuperJSON from "superjson";

import { AppRouter } from "~/server/trpc/root";
import { getQueryClient } from "./query-client";

// Now, with the newer @trpc/tanstack-react-query package, we no longer need createTRPCReact.
// We use createTRPCContext instead.
const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export { useTRPC, useTRPCClient };

/**
 * tRPC HTTP batch URL origin. Prefer `VITE_API_URL` when the UI is hosted separately
 * from the API (avoids fetching `/trpc` and receiving SPA HTML). In the browser,
 * default is same-origin. SSR fallback matches Vinxi dev (`VITE_APP_URL` / port 5173).
 */
function getBaseUrl() {
  const viteApi = import.meta.env.VITE_API_URL as string | undefined;
  const apiTrimmed = viteApi?.trim();
  if (typeof window !== "undefined") {
    if (apiTrimmed) return apiTrimmed.replace(/\/$/, "");
    return window.location.origin;
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
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        splitLink({
          condition: (op: Operation) => op.type === "subscription",
          false: httpBatchStreamLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/trpc",
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
