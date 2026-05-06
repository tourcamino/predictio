import fs from "node:fs";

const file = process.argv[2] || ".env";
const raw = fs.readFileSync(file, "utf8");
const lines = raw.split(/\r?\n/);

const errors = [];

for (let i = 0; i < lines.length; i++) {
  const lineNo = i + 1;
  const line = lines[i];
  const trimmed = line.trim();

  if (!trimmed) continue;
  if (trimmed.startsWith("#")) continue;

  // Disallow a bare "=" or empty key.
  if (trimmed === "=") {
    errors.push(`${file}:${lineNo} invalid line "="`);
    continue;
  }

  const eq = trimmed.indexOf("=");
  if (eq === -1) {
    errors.push(`${file}:${lineNo} missing "="`);
    continue;
  }

  const key = trimmed.slice(0, eq).trim();
  if (!key) {
    errors.push(`${file}:${lineNo} empty key`);
    continue;
  }

  // Basic shell-compatible env var name
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    errors.push(`${file}:${lineNo} invalid key "${key}"`);
    continue;
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`OK ${file}`);

