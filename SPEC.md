# harness-foundry — Specification (v0.1)

> **New here?** Read [docs/concepts.md](docs/concepts.md) first (5 min).

**Practical, composable harness engineering for production agents. The missing runtime layer between model and reliable behaviour.**

## Position in the ecosystem

| Repo | Owns |
|------|------|
| loop-engineering | Patterns for *designing* reliable inner loops |
| **harness-foundry** | Runtime primitives that *execute* harnesses |
| outerloop | Governance: evidence, verdict, answerability |

## Four-layer taxonomy

### L1 — Interface
Model providers, message formats, streaming adapters.

### L2 — Composition
Tools, skills, memory scopes, context assembly. Primitives in `primitives/context/`, `primitives/tools/`.

### L3 — Execution
Turn loop, sandbox isolation, permissions, budgets. Primitives in `primitives/control/`.

### L4 — Reliability
Traces, recovery, evolution, evidence emission. Primitives in `primitives/observability/`.

## Core artifacts

### HarnessStack (`stack.yaml`)
Declarative composition of primitives across four layers. Validated by `@cobusgreyling/harness-foundry-compose`.

### TraceEvent (`trace.jsonl`)
Append-only session log. One JSON object per line. Schema: [schemas/trace-event.json](schemas/trace-event.json).

### SessionManifest (`manifest.json`)
Session metadata: stack version, turn count, status, trace path.

### EvolveReport (L1)
Trace analysis with findings and suggestions. Report-only — no auto-apply in v0.1.

## CLI commands (v0.1)

| Command | Purpose |
|---------|---------|
| `foundry init` | Scaffold `.foundry/` |
| `foundry stack show` | Display active stack |
| `foundry run` | Execute session against stack |
| `foundry trace show` | Inspect session trace |
| `foundry evolve report` | L1 evolution report |

## outerloop integration

Enable in `.foundry/hooks/outerloop.yaml`:

```yaml
enabled: true
adapter: outerloop
emitOn: [session.end]
```

v0.1 writes `evidence-stub.json`. v0.2 wires `@cobusgreyling/outerloop-evidence`.

## v0.2 roadmap

- Real model adapters (Anthropic, OpenAI)
- MCP tool dispatch
- Recovery primitives (revert-on-fail)
- L2 stack diff proposals from evolve reports
- Full EvidencePackage emission