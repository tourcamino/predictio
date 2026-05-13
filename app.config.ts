import { createApp } from "vinxi";
import reactRefresh from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { config } from "vinxi/plugins/config";
import { env } from "./src/server/env";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { consoleForwardPlugin } from "./vite-console-forward-plugin";

/** Vite compares Host without port; BASE_URL may include :port */
function viteAllowedHostsFromBaseUrl(
  baseUrl: string | undefined,
): string[] | undefined {
  if (!baseUrl) return undefined;
  const host = baseUrl.split("://")[1];
  if (!host) return undefined;
  const hostname = host.split(":")[0];
  return hostname ? [hostname] : undefined;
}

/** Express (`backend`, default :3001). Vinxi dev proxies these so the browser can call same-origin `/api/*`. */
const EXPRESS_DEV_PROXY_TARGET =
  process.env.EXPRESS_PROXY_TARGET ?? "http://127.0.0.1:3001";

function expressDevApiProxy(): Record<
  string,
  { target: string; changeOrigin: boolean }
> {
  const prefixes = [
    "/api/v1",
    "/api/me",
    "/api/markets",
    "/api/admin",
    "/api/developer",
    "/api/leaderboard",
    "/api/vault",
    "/api/affiliate",
    "/api/copy",
    "/api/trades",
    "/api/translate",
  ];
  return Object.fromEntries(
    prefixes.map((prefix) => [
      prefix,
      { target: EXPRESS_DEV_PROXY_TARGET, changeOrigin: true },
    ]),
  );
}

/** Vercel sets `VERCEL=1` during build/runtime — Nitro must use the `vercel` preset (not `node-server`). */
const nitroPreset = process.env.VERCEL ? "vercel" : "node-server";

export default createApp({
  server: {
    preset: nitroPreset,
    experimental: {
      asyncContext: true,
    },
  },
  routers: [
    {
      type: "static",
      name: "public",
      dir: "./public",
    },
    {
      type: "http",
      name: "trpc",
      base: "/trpc",
      handler: "./src/server/trpc/handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: viteAllowedHostsFromBaseUrl(env.BASE_URL),
          },
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"],
        }),
      ],
    },
    {
      type: "http",
      name: "debug",
      base: "/api/debug/client-logs",
      handler: "./src/server/debug/client-logs-handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: viteAllowedHostsFromBaseUrl(env.BASE_URL),
          },
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"],
        }),
      ],
    },
    {
      type: "http",
      name: "og-meta",
      base: "/markets",
      handler: "./src/server/og-meta-handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: viteAllowedHostsFromBaseUrl(env.BASE_URL),
          },
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"],
        }),
      ],
    },
    {
      type: "http",
      name: "og-image",
      base: "/api/og",
      handler: "./src/server/og-image-handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: viteAllowedHostsFromBaseUrl(env.BASE_URL),
          },
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"],
        }),
      ],
    },
    {
      type: "http",
      name: "health",
      base: "/api/health",
      handler: "./src/server/health-handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: viteAllowedHostsFromBaseUrl(env.BASE_URL),
          },
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"],
        }),
      ],
    },
    {
      type: "http",
      name: "live",
      base: "/api/live",
      handler: "./src/server/live-handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: viteAllowedHostsFromBaseUrl(env.BASE_URL),
          },
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"],
        }),
      ],
    },
    {
      type: "spa",
      name: "client",
      handler: "./index.html",
      target: "browser",
      plugins: () => [
        config("build-chunk-limit", {
          build: {
            chunkSizeWarningLimit: 2500,
          },
        }),
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: viteAllowedHostsFromBaseUrl(env.BASE_URL),
          },
        }),
        config("express-api-proxy", {
          // @ts-expect-error Vinxi `CustomizableConfig` omits `server`; Vite still merges `server.proxy` in dev.
          server: {
            proxy: expressDevApiProxy(),
          },
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"],
        }),
        TanStackRouterVite({
          target: "react",
          autoCodeSplitting: true,
          routesDirectory: "./src/routes",
          generatedRouteTree: "./src/generated/tanstack-router/routeTree.gen.ts",
        }),
        reactRefresh(),
        nodePolyfills(),
        consoleForwardPlugin({
          enabled: true,
          endpoint: "/api/debug/client-logs",
          levels: ["log", "warn", "error", "info", "debug"],
        }),
      ],
    },
  ],
});
