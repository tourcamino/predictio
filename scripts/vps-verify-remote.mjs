#!/usr/bin/env node
/**
 * SSH → VPS: verify backend and nginx health.
 *
 * Checks:
 * - backend direct (127.0.0.1:${BACKEND_PORT}/api/v1/health) -> 200
 * - nginx proxy (127.0.0.1/api/v1/health) -> 200
 *
 * Usage:
 *   VPS_HOST=1.2.3.4 npm run vps:verify
 *   npm run vps:verify -- 1.2.3.4
 *   BACKEND_PORT=3001 npm run vps:verify -- 1.2.3.4
 */
import { spawnSync } from "node:child_process";

const host =
  process.env.VPS_HOST?.trim() ||
  process.argv.slice(2).find((a) => !a.startsWith("-"));
const user = process.env.VPS_USER || "root";
const backendPort = process.env.BACKEND_PORT || "3001";
const adminKey = process.env.ADMIN_API_KEY || process.env.BOT_API_KEY || "";

if (!host) {
  console.error(
    "Usage: VPS_HOST=x.x.x.x npm run vps:verify\n       npm run vps:verify -- x.x.x.x",
  );
  process.exit(2);
}

const remote = `
set -euo pipefail
B=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${backendPort}/api/v1/health)
N=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: api.predictio.live' http://127.0.0.1/api/v1/health)
echo "backend :${backendPort} /api/v1/health -> HTTP $B"
echo "nginx :80 /api/v1/health (Host api.predictio.live) -> HTTP $N"
test "$B" = "200"
test "$N" = "200" -o "$N" = "301" -o "$N" = "308"
if [ -n "${adminKey}" ]; then
  A=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: api.predictio.live' -H 'x-predictio-key: ${adminKey}' http://127.0.0.1/api/admin/usage?limit=1)
  echo "nginx :80 /api/admin/usage (admin, Host api.predictio.live) -> HTTP $A"
  test "$A" = "200" -o "$A" = "301" -o "$A" = "308"
else
  echo "SKIP admin usage check (ADMIN_API_KEY/BOT_API_KEY not set)"
fi
echo "OK: backend + nginx health"
`.trim();

const sshArgs = [
  "-o",
  "BatchMode=yes",
  "-o",
  "ConnectTimeout=15",
  "-o",
  "ServerAliveInterval=10",
  "-o",
  "ServerAliveCountMax=2",
  "-o",
  "StrictHostKeyChecking=accept-new",
  `${user}@${host}`,
  remote,
];

console.error(`SSH -> ${user}@${host} (verify HTTP) ...`);

const r = spawnSync("ssh", sshArgs, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);

const code = r.status ?? 1;
if (code !== 0) {
  console.error(`FAIL: ssh exited ${code}`);
}
process.exit(code);
