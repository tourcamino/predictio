#!/usr/bin/env node
/**
 * SSH → VPS: curl backend (:APP_PORT), Nginx (:80), /api/live/, /api/health/. Exit 0 only if all HTTP 200.
 *
 *   VPS_HOST=1.2.3.4 npm run vps:verify
 *   npm run vps:verify -- 1.2.3.4
 *   APP_PORT=3050 npm run vps:verify -- 1.2.3.4
 */
import { spawnSync } from "node:child_process";

const host =
  process.env.VPS_HOST?.trim() ||
  process.argv.slice(2).find((a) => !a.startsWith("-"));
const user = process.env.VPS_USER || "root";
const port = process.env.APP_PORT || "3050";

if (!host) {
  console.error(
    "Usage: VPS_HOST=x.x.x.x npm run vps:verify\n       npm run vps:verify -- x.x.x.x",
  );
  process.exit(2);
}

const remote = `
set -euo pipefail
B=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${port}/)
N=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/)
L=$(curl -s -L -o /dev/null -w '%{http_code}' http://127.0.0.1/api/live/)
H=$(curl -s -L -o /dev/null -w '%{http_code}' http://127.0.0.1/api/health/)
echo "backend :${port} -> HTTP $B"
echo "nginx :80 -> HTTP $N"
echo "/api/live/ -> HTTP $L"
echo "/api/health/ -> HTTP $H"
test "$B" = "200"
test "$N" = "200"
test "$L" = "200"
test "$H" = "200"
echo "OK: backend + nginx + /api/live/ + /api/health/"
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
