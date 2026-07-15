#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
INSTALL="$STAGE/install"
PACK_DIR="$STAGE/packs"

cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

cd "$ROOT"
pnpm build >/dev/null
mkdir -p "$PACK_DIR" "$INSTALL"

for pkg in "$ROOT"/packages/*/package.json; do
  dir="$(dirname "$pkg")"
  name="$(node -e "console.log(require('$pkg').name)")"
  if [[ "$name" == @cobusgreyling/harness-foundry* ]]; then
    (cd "$dir" && pnpm pack --pack-destination "$PACK_DIR" >/dev/null)
  fi
done

cd "$INSTALL"
PACK_DIR="$PACK_DIR" node -e '
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const packDir = process.env.PACK_DIR;
const tarballs = fs.readdirSync(packDir).filter((f) => f.endsWith(".tgz"));
const overrides = {};
for (const file of tarballs) {
  const base = file.replace(/\.tgz$/, "").replace(/^cobusgreyling-/, "");
  const version = base.slice(base.lastIndexOf("-") + 1);
  const pkgShort = base.slice(0, -(version.length + 1));
  overrides[`@cobusgreyling/${pkgShort}`] = `file:${path.join(packDir, file)}`;
}
fs.writeFileSync("package.json", JSON.stringify({
  name: "foundry-smoke",
  private: true,
  dependencies: { "@cobusgreyling/harness-foundry": overrides["@cobusgreyling/harness-foundry"] },
  pnpm: { overrides },
}, null, 2));
'

pnpm install >/dev/null
DEMO="$INSTALL/demo-project"
mkdir -p "$DEMO"
cd "$DEMO"
npx foundry init --from minimal --name smoke
npx foundry validate
OUT="$(npx foundry run --goal smoke 2>&1)"
echo "$OUT" | grep -q "Session complete"
SESSION_ID="$(echo "$OUT" | sed -n 's/.*ID: //p' | head -1)"
npx foundry trace show --session "$SESSION_ID" >/dev/null
npx foundry evolve report --session "$SESSION_ID" >/dev/null
echo "Smoke test passed"