import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getBaseUrl } from "./utils/base-url";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" } as const;

const INDEX_CANDIDATES = [
  join(process.cwd(), ".vercel/output/static/index.html"),
  join(process.cwd(), ".output/public/index.html"),
  join(process.cwd(), "dist/client/index.html"),
];

let cachedIndexHtml: string | null = null;

async function loadSpaIndexHtml(): Promise<string | null> {
  if (cachedIndexHtml) return cachedIndexHtml;
  for (const path of INDEX_CANDIDATES) {
    try {
      const html = await readFile(path, "utf-8");
      cachedIndexHtml = html;
      return html;
    } catch {
      /* try next path */
    }
  }
  try {
    const base = getBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/index.html`, {
      headers: { accept: "text/html" },
    });
    if (res.ok) {
      const html = await res.text();
      cachedIndexHtml = html;
      return html;
    }
  } catch {
    /* network fallback failed */
  }
  return null;
}

/** Serve the client SPA shell so TanStack Router can hydrate (og-meta router intercepts /markets/*). */
export async function passThroughToClientSpa(): Promise<Response> {
  const html = await loadSpaIndexHtml();
  if (html) {
    return new Response(html, { status: 200, headers: HTML_HEADERS });
  }
  return new Response("<!DOCTYPE html><html><body><div id=\"root\"></div></body></html>", {
    status: 200,
    headers: HTML_HEADERS,
  });
}
