/**
 * Regression guard: forbidden Node/h3 patterns in Vinxi HTTP handlers only.
 * Excludes backend/** and vite dev plugins.
 *
 *   npm run check:vinxi-runtime
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const handlerDir = path.join(root, "src", "server");

const FORBIDDEN = [
  { id: "h3-import", re: /from\s+["']h3["']/ },
  { id: "event-node-req", re: /event\.node\.req/ },
  { id: "event-node-res", re: /event\.node\.res/ },
  { id: "setResponseHeader", re: /\bsetResponseHeader\b/ },
  { id: "sendRedirect", re: /\bsendRedirect\b/ },
  { id: "res-statusCode", re: /res\.statusCode/ },
  { id: "res-writeHead", re: /res\.writeHead/ },
  { id: "res-end", re: /res\.end\s*\(/ },
  { id: "duplex-half", re: /duplex:\s*["']half["']/ },
  { id: "manual-request", re: /new\s+Request\s*\(/ },
];

function collectHandlerFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "trpc" && fs.existsSync(path.join(full, "handler.ts"))) {
        out.push(path.join(full, "handler.ts"));
      } else if (name.name !== "trpc") {
        out.push(...collectHandlerFiles(full));
      }
      continue;
    }
    if (name.name.endsWith("-handler.ts")) out.push(full);
  }
  return out;
}

const files = collectHandlerFiles(handlerDir);
let failed = false;

for (const file of files) {
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");
  for (const rule of FORBIDDEN) {
    if (rule.re.test(text)) {
      console.error(`FAIL ${rel}: forbidden pattern "${rule.id}"`);
      failed = true;
    }
  }
}

if (failed) {
  console.error("\ncheck-vinxi-runtime-contract: FAILED\n");
  process.exit(1);
}

console.log(
  `check-vinxi-runtime-contract: OK (${files.length} handler files)\n`,
);
