# with-outerloop

**Flagship example:** run a harness session, emit evidence, and issue a human verdict — the full agentic engineering stack.

```
loop-engineering  →  harness-foundry  →  outerloop
   (patterns)         (runtime)          (governance)
```

## What you get

| Step | Tool | Artifact |
|------|------|----------|
| 1. Scaffold governance | `outerloop init` | `.outerloop/` policy, taste, ledger |
| 2. Scaffold harness | `foundry init --from implementer` | `.foundry/stack.yaml`, primitives |
| 3. Enable evidence hook | Edit `hooks/outerloop.yaml` | Emission on `session.end` |
| 4. Run session | `foundry run` | Trace + `evidence.json` |
| 5. Human verdict | `outerloop verdict review` | Ship/block with rationale |

## Quick start (copy-paste)

From this directory:

```bash
# 1. Governance layer
npx @cobusgreyling/outerloop init

# 2. Harness runtime
npx @cobusgreyling/harness-foundry init --from implementer --name my-app

# 3. Enable evidence emission
cat > .foundry/hooks/outerloop.yaml <<'EOF'
enabled: true
adapter: outerloop
emitOn:
  - session.end
EOF

# 4. Run a session
foundry validate
foundry run --goal "Implement feature with evidence"

# 5. Review evidence and issue verdict
foundry sessions list
outerloop verdict review <evidence-id>   # or: outerloop ledger why <evidence-id>
```

## One-command demo (from repo root)

Requires a local build (`pnpm build`):

```bash
pnpm demo:outerloop
```

This runs `scripts/demo-with-outerloop.sh` — init, session, evidence artifact, and verdict review when `outerloop` is installed.

## Artifacts after a run

```
.foundry/
  stack.yaml
  stack.lock
  hooks/outerloop.yaml
  sessions/<id>/
    trace.jsonl          # full primitive activation trace
    evidence.json        # EvidencePackage for outerloop
    manifest.json

.outerloop/              # when outerloop init was run
  evidence/<id>.json
  verdicts/
  ledger/
```

## Trace → evidence flow

```
foundry run
  → primitive.activate / primitive.complete (per layer)
  → session.end
  → emit/outerloop-evidence primitive
  → .foundry/sessions/<id>/evidence.json
  → .outerloop/evidence/<id>.json (if outerloop present)
```

Inspect the trace:

```bash
foundry trace show --session <id>
```

Reconstruct answerability:

```bash
outerloop ledger why <evidence-id>
```

## Host integration (optional)

Run inside Cursor or Claude Code with host detection:

```bash
foundry host integrate cursor      # or claude-code
foundry run --goal "Implement X" --host cursor
```

## CI gate

Validate stack and primitives in CI with the reusable workflow:

```yaml
jobs:
  foundry:
    uses: cobusgreyling/harness-foundry/.github/workflows/foundry-gate.yml@main
```

Pair with [outerloop evidence-gate](https://github.com/cobusgreyling/outerloop/blob/main/docs/github-action.md) for governance before merge.

## Next

- [QUICKSTART.md](../../QUICKSTART.md) — five-minute harness loop
- [docs/concepts.md](../../docs/concepts.md) — four-layer taxonomy
- [outerloop QUICKSTART](https://github.com/cobusgreyling/outerloop/blob/main/QUICKSTART.md) — verdict and ledger