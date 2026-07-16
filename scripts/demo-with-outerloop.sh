#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO_DIR="$ROOT/examples/with-outerloop/.demo-run"
CLI="node $ROOT/packages/cli/dist/cli.js"
OUTERLOOP_CLI="$(command -v outerloop 2>/dev/null || true)"

rm -rf "$DEMO_DIR"
mkdir -p "$DEMO_DIR"
cd "$DEMO_DIR"

echo "=== Full stack: harness-foundry + outerloop ==="
echo ""

echo "=== 1. Init outerloop governance ==="
if [[ -n "$OUTERLOOP_CLI" ]]; then
  outerloop init --project-root "$DEMO_DIR" --yes 2>/dev/null || outerloop init --project-root "$DEMO_DIR"
else
  echo "(outerloop CLI not installed — evidence still written under .foundry/sessions/)"
  echo "  Install: npx @cobusgreyling/outerloop init"
fi

echo ""
echo "=== 2. Init harness (implementer preset) ==="
$CLI init --from implementer --name full-stack

echo ""
echo "=== 3. Enable outerloop evidence hook ==="
cat > .foundry/hooks/outerloop.yaml <<'YAML'
enabled: true
adapter: outerloop
emitOn:
  - session.end
YAML

echo ""
echo "=== 4. Validate stack ==="
$CLI validate

echo ""
echo "=== 5. Run session ==="
OUTPUT=$($CLI run --goal "Implement feature with evidence" 2>&1)
echo "$OUTPUT"

SESSION_ID=$(echo "$OUTPUT" | sed -n 's/.*ID: //p' | head -1)
if [[ -z "$SESSION_ID" ]]; then
  echo "Could not parse session ID"
  exit 1
fi

EVIDENCE_PATH=".foundry/sessions/$SESSION_ID/evidence.json"
echo ""
echo "=== 6. Evidence artifact ==="
if [[ -f "$EVIDENCE_PATH" ]]; then
  echo "  $EVIDENCE_PATH"
  head -20 "$EVIDENCE_PATH"
else
  echo "  (no evidence.json — check hooks/outerloop.yaml)"
fi

if [[ -d ".outerloop/evidence" ]]; then
  echo ""
  echo "=== 7. outerloop evidence store ==="
  ls -1 .outerloop/evidence/ 2>/dev/null || true
  if [[ -n "$OUTERLOOP_CLI" ]]; then
    EVIDENCE_ID=$(basename "$(ls -1 .outerloop/evidence/*.json 2>/dev/null | head -1)" .json)
    if [[ -n "$EVIDENCE_ID" ]]; then
      echo ""
      echo "=== 8. Verdict review (outerloop) ==="
      outerloop verdict review "$EVIDENCE_ID" --project-root "$DEMO_DIR" || true
    fi
  fi
fi

echo ""
echo "Demo complete. Artifacts in $DEMO_DIR/.foundry/"