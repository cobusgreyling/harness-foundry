#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO_DIR="$ROOT/examples/hello-harness/.demo-run"

rm -rf "$DEMO_DIR"
mkdir -p "$DEMO_DIR"
cd "$DEMO_DIR"

echo "=== 1. Init harness ==="
node "$ROOT/packages/cli/dist/cli.js" init --name demo

echo ""
echo "=== 2. Show stack ==="
node "$ROOT/packages/cli/dist/cli.js" stack show

echo ""
echo "=== 3. Run session ==="
OUTPUT=$(node "$ROOT/packages/cli/dist/cli.js" run --goal "Demo harness session" 2>&1)
echo "$OUTPUT"

SESSION_ID=$(echo "$OUTPUT" | sed -n 's/.*ID: //p' | head -1)
if [[ -z "$SESSION_ID" ]]; then
  echo "Could not parse session ID"
  exit 1
fi

echo ""
echo "=== 4. Trace ==="
node "$ROOT/packages/cli/dist/cli.js" trace show --session "$SESSION_ID"

echo ""
echo "=== 5. Evolve report (L1) ==="
node "$ROOT/packages/cli/dist/cli.js" evolve report --session "$SESSION_ID"

echo ""
echo "Demo complete. Artifacts in $DEMO_DIR/.foundry/"