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
Model providers: `model/mock`, `model/anthropic`, `model/openai`, `model/openai-compatible`.

### L2 — Composition
Context (`context/state-file`, `context/agents-md`), tools (`tools/git-worktree-write`, `tools/mcp-stdio`).

### L3 — Execution
Turn loop (model ↔ tools), sandbox, budgets (`control/token-budget-100k`, `control/tool-call-cap`).

### L4 — Reliability
Traces, recovery, evolution (L1 report → L2 proposal → gated apply), outerloop evidence.

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
| `foundry sessions list` | List sessions |
| `foundry run [--turns 8]` | Execute session (tool loop) |
| `foundry host integrate` | Cursor / Claude Code |
| `foundry trace show` | Inspect trace |
| `foundry evolve report` | L1 report |
| `foundry evolve proposal` | L2 proposal |
| `foundry evolve apply --proposal <id> --yes` | Human-gated apply |

Presets: `minimal`, `implementer`, `reviewer`, `triage` (+ loop-engineering aliases).

## Plugin API

```ts
import { registerPrimitiveHandler } from "@cobusgreyling/harness-foundry-runtime";
```

See [docs/primitive-spec.md](docs/primitive-spec.md).

## outerloop integration

Enable in `.foundry/hooks/outerloop.yaml`. Emits full `EvidencePackage` via `@cobusgreyling/outerloop-core` when available.

## Roadmap

See [ROADMAP.md](ROADMAP.md) and [docs/platform-roadmap.md](docs/platform-roadmap.md).
