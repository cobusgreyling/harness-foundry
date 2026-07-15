<p align="center">
  <img src="https://raw.githubusercontent.com/cobusgreyling/harness-foundry/main/docs/harness-foundry.png" alt="harness-foundry" />
</p>

# harness-foundry

[![CI](https://github.com/cobusgreyling/harness-foundry/actions/workflows/ci.yml/badge.svg)](https://github.com/cobusgreyling/harness-foundry/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@cobusgreyling/harness-foundry)](https://www.npmjs.com/package/@cobusgreyling/harness-foundry)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Practical, composable harness engineering for production agents.**

The missing runtime layer between model and reliable behaviour.

## Ecosystem

```
loop-engineering  →  harness-foundry  →  outerloop
   (patterns)         (runtime)          (governance)
```

| Repo | Role |
|------|------|
| [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | Design reliable inner loops |
| **harness-foundry** | Execute composable harness primitives |
| [outerloop](https://github.com/cobusgreyling/outerloop) | Evidence, verdict, answerability |

→ [Core concepts](docs/concepts.md) · [vs alternatives](docs/vs-alternatives.md) · [architecture](docs/architecture.md)

## The stack in 60 seconds

```
Model  →  Primitives  →  Runtime  →  Trace  →  Evidence
         (compose)      (session)    (jsonl)   (outerloop)
```

Compose harnesses from declarative primitives. Run sessions, record traces, evolve stacks from real runs.

## Try it now

```bash
npx @cobusgreyling/harness-foundry init --from minimal
foundry validate
foundry run --goal "Verify harness wiring"
foundry sessions list
foundry trace show --session <id>
foundry evolve report --session <id>
foundry host integrate cursor
foundry run --goal "Implement feature X" --host cursor
```

Or clone and run the full demo:

```bash
git clone https://github.com/cobusgreyling/harness-foundry.git
cd harness-foundry && pnpm install && pnpm build && pnpm demo
```

<details>
<summary>Example demo output</summary>

```
=== 3. Run session ===
Session complete
  ID: c8ca022a-5d8f-4260-a040-a2ba3947b5a8
  Status: completed
  Turns: 1

=== 4. Trace ===
primitive.activate (model/mock)
primitive.complete (model/mock)
...
session.end
```

</details>

→ [QUICKSTART.md](./QUICKSTART.md)

## Choose your stack

| Persona | Get started |
|---------|-------------|
| **Smoke / CI** | `foundry init --from minimal` |
| **Implementer** | `foundry init --from implementer` |
| **+ Governance** | Enable `.foundry/hooks/outerloop.yaml` + [outerloop](https://github.com/cobusgreyling/outerloop) |

## Four-layer taxonomy

| Layer | Packages | Responsibility |
|-------|----------|----------------|
| **L1 Interface** | `interface` | Model providers (mock, anthropic) |
| **L2 Composition** | `compose`, `mcp` | Tools, context, catalogue |
| **L3 Execution** | `runtime` | Turn loop, sandbox, control |
| **L4 Reliability** | `trace`, `evolve`, `emit` | Traces, recovery, evidence |

## CLI essentials

| Command | Purpose |
|---------|---------|
| `init` | Scaffold `.foundry/` with stack preset |
| `validate` | Check stack against primitive catalogue |
| `run` | Execute session, write trace + lock |
| `primitives list` | Browse available primitives |
| `sessions list` | List past sessions |
| `evolve report` | L1 trace analysis |
| `evolve proposal` | L2 stack diff (human review) |

→ [CLI reference](docs/cli.md) · [API](docs/api.md) · [composition](docs/composition.md)

## Monorepo packages

| Package | Responsibility |
|---------|----------------|
| `@cobusgreyling/harness-foundry-core` | Schemas, types, paths |
| `@cobusgreyling/harness-foundry-compose` | Stack builder, catalogue, lock |
| `@cobusgreyling/harness-foundry-interface` | Model adapters |
| `@cobusgreyling/harness-foundry-mcp` | MCP tool dispatch stub |
| `@cobusgreyling/harness-foundry-runtime` | Session runner |
| `@cobusgreyling/harness-foundry-trace` | Trace recorder |
| `@cobusgreyling/harness-foundry-evolve` | L1/L2 evolution |
| `@cobusgreyling/harness-foundry-emit` | outerloop evidence |
| `@cobusgreyling/harness-foundry` | `foundry` CLI |

## Development

```bash
pnpm install && pnpm build && pnpm test && pnpm lint
pnpm foundry --help
```

→ [CONTRIBUTING.md](CONTRIBUTING.md) · [ROADMAP.md](ROADMAP.md)

## Contributors

| Name | GitHub | Role |
|------|--------|------|
| Cobus Greyling | [@cobusgreyling](https://github.com/cobusgreyling) | Creator & maintainer |

→ [CONTRIBUTORS.md](CONTRIBUTORS.md) · [contributors graph](https://github.com/cobusgreyling/harness-foundry/graphs/contributors)

## License

MIT — see [LICENSE](LICENSE).