#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="node $ROOT/packages/cli/dist/cli.js"
for d in hello-harness with-outerloop mcp-filesystem; do
  echo "=== example: $d ==="
  (cd "$ROOT/examples/$d" && $CLI validate && $CLI run --goal "list the directory" --turns 3 --host standalone)
done
echo "All example fixtures OK"
