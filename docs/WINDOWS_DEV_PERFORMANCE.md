# Windows development performance

Large `npm install` / `pnpm install` runs can take **many minutes** when the repo lives under **OneDrive** (`Desktop\…`, `Documents\…`). That is expected: heavy I/O into `node_modules`, not a bug in this codebase.

## Why it is slow

1. **Dependency count** — Resolving, downloading, and extracting hundreds of packages into `node_modules`. After `package.json` changes (e.g. TanStack pins), the resolver does more work.
2. **OneDrive** — Every new file under a synced folder can trigger **cloud sync**, **indexing**, and **Defender real-time scan**. The same install on a plain local disk (e.g. `C:\dev\…`) is often **several times faster**.
3. **Silent phases** — npm/pnpm may show little output while resolving or unpacking; the process is still working.
4. **Network** — Slow or unstable access to the npm registry increases download time.

## What to do in practice

### A. Prefer a clone outside OneDrive (best)

```text
C:\dev\predictio
```

Clone or move the repo there and work from that path. Keep OneDrive for documents, not for active `node_modules`.

### B. Exclude `node_modules` from Microsoft Defender (recommended on Windows)

From an **elevated** PowerShell (Run as administrator), from the repo root:

```powershell
.\scripts\windows-dev-performance.ps1 -AddDefenderExclusion
```

Or manually: **Windows Security** → **Virus & threat protection** → **Manage settings** → **Exclusions** → **Add exclusion** → **Folder** → select `<repo>\node_modules`.

### C. OneDrive

- **Pause syncing** while running a long install, or  
- Move the repo out of the synced tree (see A).  
There is no reliable one-line “exclude only `node_modules` from OneDrive” for all account types; avoiding the synced path is the robust fix.

### D. Install commands

- After pulling `package.json` changes: run **`npm install`** (or **`pnpm install`** if your team standardises on pnpm) **once**, not in a loop.  
- This repo lists `package-lock.json` in `.gitignore`; npm users regenerate it locally. Teams using **pnpm** should commit/use `pnpm-lock.yaml` per your process.

## Optional script

See `scripts/windows-dev-performance.ps1` — checks for OneDrive in the path and can add a Defender exclusion when run as admin.
