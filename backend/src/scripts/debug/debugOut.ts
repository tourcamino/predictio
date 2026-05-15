import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/** Writes next to OS temp dir (e.g. Windows: %TEMP%, Linux: /tmp). */
export function debugJsonOutput(name: string): string {
  return path.join(os.tmpdir(), name);
}

export function writeDebugJson(fileBase: string, data: unknown): string {
  const dest = debugJsonOutput(fileBase);
  fs.writeFileSync(dest, JSON.stringify(data, null, 2), "utf8");
  return dest;
}
