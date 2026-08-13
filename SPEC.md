# harness-foundry — Specification (v0.5)

> **New here?** Read [docs/concepts.md](docs/concepts.md) first (5 min).

**Practical, composable harness engineering for production agents. The runtime layer between model and reliable behaviour.**

## Position in the ecosystem

| Repo | Owns |
|------|------|
| [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | Patterns for *designing* reliable inner loops |
| **harness-foundry** | Runtime primitives that *execute* harnesses |
| [outerloop](https://github.com/cobusgreyling/outerloop) | Governance: evidence, verdict, answerability |

## Four-layer taxonomy

### L1 — Interface
Model providers: `model/mock`, `model/anthropic`, `model/openai`, `model/openai-compatible`, `model/grok`.

### L2 — Composition
Context (`context/state-file`, `context/agents-md`, `context/skills-dir`), tools (`tools/git-worktree-write`, `tools/mcp-stdio`, `tools/search-grep`), memory (`memory/file-log`).

### L3 — Execution
Turn loop (model ↔ tools), sandbox (`sandbox/worktree-isolated`, `sandbox/readonly`), budgets (`control/token-budget-100k`, `control/token-budget-50k`, `control/tool-call-cap`), policy (`policy/path-allowlist`, `policy/command-allowlist`, `policy/secret-scrub`, `control/network-deny`).

### L4 — Reliability
Traces, recovery (`recovery/revert-on-test-fail`, `recovery/narrow-scope`, `recovery/retry-once`), evolution (L1 report → L2 proposal → gated apply), outerloop evidence, tool timeline.

## Core artifacts

### HarnessStack (`stack.yaml`)
Declarative primitive composition across four layers.

### StackLock (`stack.lock`)
Primitive digests locked per session run.

### TraceEvent (`trace.jsonl`)
See [docs/trace-events.md](docs/trace-events.md). Includes `model.complete`, `tool.call`, `tool.result`, `budget.*`.

### EvolveReport (L1) / EvolveProposal (L2) / Apply audit
Trace-driven improvement. Apply requires explicit `--yes` human gate; audits land in `.foundry/evolve/applied/`.

## Session lifecycle (v0.5)

```
validate → setup primitives → turn loop (model↔tools, budgets) → verify/recover → evidence → evolve
```

Default max turns: **8**. Budgets enforced mid-loop.

## CLI commands (v0.5)

| Command | Purpose |
|---------|---------|
| `foundry init [--from] [--dry-run]` | Scaffold `.foundry/` |
| `foundry validate` | Validate stack against catalogue |
| `foundry stack show` | Display active stack |
| `foundry primitives list \| show <id>` | Catalogue |
| `foundry sessions list` | List sessions (session index) |
| `foundry run [--turns 8] [-C dir]` | Execute session (tool loop) |
| `foundry host integrate` | Cursor / Claude Code |
| `foundry trace show \| replay` | Inspect / narrate trace |
| `foundry evolve report` | L1 report |
| `foundry evolve proposal` | L2 proposal |
| `foundry evolve apply --proposal <id> --yes` | Human-gated apply |
| `foundry completion [bash\|zsh\|fish]` | Shell completions |

Presets: `minimal`, `implementer`, `reviewer`, `triage`, `ci-sweeper`, `mcp-worker`, `with-outerloop` (+ loop-engineering aliases).

## Plugin API

```ts
import { registerPrimitiveHandler } from "@cobusgreyling/harness-foundry-runtime";
```

See [docs/primitive-spec.md](docs/primitive-spec.md).

## outerloop integration

Enable in `.foundry/hooks/outerloop.yaml`. Emits full `EvidencePackage` via `@cobusgreyling/outerloop-core` when available.

## Roadmap

See [ROADMAP.md](ROADMAP.md) and [docs/platform-roadmap.md](docs/platform-roadmap.md).
