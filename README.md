# harness-foundry

**Practical, composable harness engineering for production agents.**

The missing runtime layer between model and reliable behaviour.

Companion to [loop-engineering](https://github.com/cobusgreyling/loop-engineering) (loop patterns) and [outerloop](https://github.com/cobusgreyling/outerloop) (governance). Works standalone or wired to outerloop evidence hooks.

## The stack in 60 seconds

```
Model  →  Primitives  →  Runtime  →  Trace  →  Evidence hook
         (compose)      (session)    (jsonl)   (outerloop)
```

Developers compose harnesses from declarative primitives. The runtime executes sessions, records traces, and proposes stack evolution from real runs.

→ [Core concepts](docs/concepts.md) (5 min)

## Try it now

```bash
git clone https://github.com/cobusgreyling/harness-foundry.git
cd harness-foundry && pnpm install && pnpm build && pnpm demo
```

Or in any project:

```bash
npx @cobusgreyling/harness-foundry init
foundry stack show
foundry run --goal "Verify harness wiring"
foundry trace show --session <id>
foundry evolve report --session <id>
```

## Four-layer taxonomy

| Layer | Package (v0.1) | Responsibility |
|-------|----------------|----------------|
| **L1 Interface** | planned | Model providers, streaming |
| **L2 Composition** | `compose` | Tools, skills, context assembly |
| **L3 Execution** | `runtime` | Turn loop, sandbox, control |
| **L4 Reliability** | `trace`, `evolve`, `emit` | Traces, recovery, evidence |

## Monorepo packages

| Package | Responsibility |
|---------|----------------|
| `@cobusgreyling/harness-foundry-core` | Schemas, types, paths |
| `@cobusgreyling/harness-foundry-compose` | Stack builder and validator |
| `@cobusgreyling/harness-foundry-trace` | Trace recorder |
| `@cobusgreyling/harness-foundry-runtime` | Session runner |
| `@cobusgreyling/harness-foundry-evolve` | L1 trace-driven reports |
| `@cobusgreyling/harness-foundry-emit` | outerloop evidence hooks |
| `@cobusgreyling/harness-foundry` | `foundry` CLI |

## Project layout after `foundry init`

```
.foundry/
├── stack.yaml
├── state/STATE.md
├── sessions/<id>/
│   ├── manifest.json
│   └── trace.jsonl
├── evolve/reports/
└── hooks/outerloop.yaml
```

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm foundry --help
```

## License

MIT — see [LICENSE](LICENSE).