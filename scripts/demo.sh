#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO_DIR="$ROOT/examples/hello-harness/.demo-run"
CLI="node $ROOT/packages/cli/dist/cli.js"

rm -rf "$DEMO_DIR"
mkdir -p "$DEMO_DIR"
cd "$DEMO_DIR"

echo "=== 1. Init harness ==="
$CLI init --from minimal --name demo

echo ""
echo "=== 2. Validate ==="
$CLI validate

echo ""
echo "=== 3. Show stack ==="
$CLI stack show

echo ""
echo "=== 4. Primitives ==="
$CLI primitives list | head -12

echo ""
echo "=== 5. Run session ==="
OUTPUT=$($CLI run --goal "Demo harness session" 2>&1)
echo "$OUTPUT"

SESSION_ID=$(echo "$OUTPUT" | sed -n 's/.*ID: //p' | head -1)
if [[ -z "$SESSION_ID" ]]; then
  echo "Could not parse session ID"
  exit 1
fi

echo ""
echo "=== 6. Sessions ==="
$CLI sessions list

echo ""
echo "=== 7. Trace ==="
$CLI trace show --session "$SESSION_ID"

echo ""
echo "=== 8. Evolve report (L1) ==="
$CLI evolve report --session "$SESSION_ID"

echo ""
echo "=== 9. Evolve proposal (L2) ==="
$CLI evolve proposal --session "$SESSION_ID"

echo ""
echo "Demo complete. Artifacts in $DEMO_DIR/.foundry/"