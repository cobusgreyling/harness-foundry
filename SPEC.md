# harness-foundry — Specification (v0.2)

> **New here?** Read [docs/concepts.md](docs/concepts.md) first (5 min).

**Practical, composable harness engineering for production agents. The missing runtime layer between model and reliable behaviour.**

## Position in the ecosystem

| Repo | Owns |
|------|------|
| [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | Patterns for *designing* reliable inner loops |
| **harness-foundry** | Runtime primitives that *execute* harnesses |
| [outerloop](https://github.com/cobusgreyling/outerloop) | Governance: evidence, verdict, answerability |

## Four-layer taxonomy

### L1 — Interface
Model providers (`model/mock`, `model/anthropic`). Package: `@cobusgreyling/harness-foundry-interface`.

### L2 — Composition
Tools, skills, context. Primitives in `primitives/context/`, `primitives/tools/`. MCP stub: `@cobusgreyling/harness-foundry-mcp`.

### L3 — Execution
Turn loop, sandbox, budgets. Package: `@cobusgreyling/harness-foundry-runtime`.

### L4 — Reliability
Traces, recovery, evolution, evidence. Packages: `trace`, `evolve`, `emit`.

## Core artifacts

### HarnessStack (`stack.yaml`)
Declarative primitive composition across four layers.

### StackLock (`stack.lock`)
Primitive digests locked per session run.

### TraceEvent (`trace.jsonl`)
Events: `primitive.activate`, `primitive.complete`, `recovery.triggered`, `evidence.emitted`.

### EvolveReport (L1) / EvolveProposal (L2)
Trace-driven improvement. L2 requires human review before apply.

## CLI commands (v0.2)

| Command | Purpose |
|---------|---------|
| `foundry init [--from minimal\|implementer]` | Scaffold `.foundry/` |
| `foundry validate` | Validate stack against catalogue |
| `foundry stack show` | Display active stack |
| `foundry primitives list` | List primitives |
| `foundry sessions list` | List sessions |
| `foundry run` | Execute session |
| `foundry trace show` | Inspect trace |
| `foundry evolve report` | L1 report |
| `foundry evolve proposal` | L2 proposal |

## outerloop integration

Enable in `.foundry/hooks/outerloop.yaml`. Emits full `EvidencePackage` via `@cobusgreyling/outerloop-core`.

## v0.3 roadmap

See [ROADMAP.md](ROADMAP.md).