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

→ **[Showcase site](https://cobusgreyling.github.io/harness-foundry/)** · **[Showcase doc](docs/showcase.md)** — demos, stacks, full-stack walkthroughs, and stories  
→ **[Launch discussion](https://github.com/cobusgreyling/harness-foundry/discussions/16)** — Show HN / first-run Q&A

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

→ [Showcase](docs/showcase.md) · [Core concepts](docs/concepts.md) · [vs alternatives](docs/vs-alternatives.md) · [architecture](docs/architecture.md)

## The stack in 60 seconds

```
Model  →  Primitives  →  Runtime  →  Trace  →  Evidence
         (compose)      (session)    (jsonl)   (outerloop)
```

Compose harnesses from declarative primitives. Run sessions, record traces, evolve stacks from real runs.

## Try it now

```bash
npx @cobusgreyling/harness-foundry init --from minimal
# From a loop-engineering pattern (LE → Foundry funnel):
npx @cobusgreyling/harness-foundry init --from loop-engineering:daily-triage
# Or scaffold both from LE:
npx @cobusgreyling/loop-init . --pattern daily-triage --tool grok --with-foundry
foundry validate
foundry run --goal "Verify harness wiring"
foundry sessions list
foundry trace show --session <id>
foundry evolve report --session <id>
```

**+ Governance:** see the [with-outerloop example](examples/with-outerloop/) for evidence → verdict → answerability.

**+ Cursor / Claude Code:**

```bash
foundry host integrate cursor    # or claude-code
foundry run --goal "Implement feature X" --host cursor
```

Or clone and run the full demo:

```bash
git clone https://github.com/cobusgreyling/harness-foundry.git
cd harness-foundry && pnpm install && pnpm build && pnpm demo
```

## Demo (terminal)

<details open>
<summary><code>pnpm demo</code> — full session output</summary>

```
=== 1. Init harness ===
Harness "demo" initialized (minimal)
  .foundry/stack.yaml
  .foundry/stack.lock

=== 2. Validate ===
Stack is valid.

=== 5. Run session ===
Session complete
  ID: 41dfdac5-921e-4e13-9ade-1f7e35932a3c
  Host: standalone
  Status: completed
  Turns: 1

=== 7. Trace ===
session.start → stack.resolved → turn.start
primitive.activate (model/mock) → primitive.complete (model/mock)
primitive.activate (sandbox/worktree-isolated) → ...
session.end

=== 9. Evolve proposal (L2) ===
L2 proposal written — Human gate: review before applying to stack.yaml
```

→ Full transcript: [docs/demo-terminal.txt](docs/demo-terminal.txt)

</details>

→ [QUICKSTART.md](QUICKSTART.md) · [Windows](QUICKSTART.windows.md)

## Choose your stack

| Persona | Get started |
|---------|-------------|
| **Smoke / CI** | `foundry init --from minimal` |
| **Implementer** | `foundry init --from implementer` |
| **Review / triage** | `foundry init --from reviewer` · `foundry init --from triage` |
| **CI sweeper** | `foundry init --from ci-sweeper` |
| **MCP worker** | `foundry init --from mcp-worker` |
| **+ Governance** | `foundry init --from with-outerloop` |
| **+ IDE host** | `foundry host integrate cursor` |

## Four-layer taxonomy

| Layer | Packages | Responsibility |
|-------|----------|----------------|
| **L1 Interface** | `interface` | Model providers (mock, anthropic, openai, grok) |
| **L2 Composition** | `compose`, `mcp` | Tools, context, catalogue |
| **L3 Execution** | `runtime` | Turn loop, sandbox, control |
| **L4 Reliability** | `trace`, `evolve`, `emit` | Traces, recovery, evidence |

## CLI essentials

| Command | Purpose |
|---------|---------|
| `init` | Scaffold `.foundry/` with stack preset |
| `validate` | Check stack against primitive catalogue |
| `run` | Execute session, write trace + lock |
| `host integrate` | Install Cursor / Claude Code integration |
| `primitives list` / `show` | Browse available primitives |
| `sessions list` | List past sessions (from session index) |
| `trace replay` | Narrative replay of a session |
| `evolve report` | L1 trace analysis |
| `evolve proposal` | L2 stack diff (human review) |
| `completion` | Print bash / zsh / fish completions |

→ [CLI reference](docs/cli.md) · [API](docs/api.md) · [composition](docs/composition.md)

## CI integration

```yaml
jobs:
  foundry-gate:
    uses: cobusgreyling/harness-foundry/.github/workflows/foundry-gate.yml@main
```

→ [docs/github-action.md](docs/github-action.md)

## Monorepo packages

| Package | Responsibility |
|---------|----------------|
| `@cobusgreyling/harness-foundry-core` | Schemas, types, paths |
| `@cobusgreyling/harness-foundry-compose` | Stack builder, catalogue, lock |
| `@cobusgreyling/harness-foundry-interface` | Model adapters |
| `@cobusgreyling/harness-foundry-mcp` | MCP stdio JSON-RPC client |
| `@cobusgreyling/harness-foundry-runtime` | Session runner |
| `@cobusgreyling/harness-foundry-trace` | Trace recorder |
| `@cobusgreyling/harness-foundry-evolve` | L1/L2 evolution |
| `@cobusgreyling/harness-foundry-emit` | outerloop evidence |
| `@cobusgreyling/harness-foundry-host` | Cursor / Claude Code adapters |
| `@cobusgreyling/harness-foundry` | `foundry` CLI |

## Status

**v0.5.1** — Catalogue depth (≥ 25 primitives), enforced policy primitives, host-bridge traces, session index.

**Platform plan (six pillars → v1):** catalogue → registry → evolve → fleet → observe → bench.

→ [CHANGELOG.md](./CHANGELOG.md) · [ROADMAP.md](./ROADMAP.md) · [Platform roadmap](./docs/platform-roadmap.md)

## Development

```bash
git clone https://github.com/cobusgreyling/harness-foundry.git
cd harness-foundry && pnpm install && pnpm build && pnpm test
pnpm demo
pnpm demo:outerloop   # full stack with outerloop
```

**Dev Container:** open in VS Code / GitHub Codespaces — `.devcontainer/` runs install + build on create.

→ [Contributor start here](https://github.com/cobusgreyling/harness-foundry/discussions/12) · [CONTRIBUTING.md](./CONTRIBUTING.md) · [Good first issues](docs/good-first-issues.md)  
[Code of Conduct](./CODE_OF_CONDUCT.md) · [Security policy](./SECURITY.md)

## Contributors

| Name | GitHub | Role |
|------|--------|------|
| Cobus Greyling | [@cobusgreyling](https://github.com/cobusgreyling) | Creator & maintainer |

→ [CONTRIBUTORS.md](./CONTRIBUTORS.md) · [contributors graph](https://github.com/cobusgreyling/harness-foundry/graphs/contributors)

## Contributing philosophy

- Primitives are versioned, declarative, and swappable.
- Traces drive evolution — report before you tune.
- Human gates before stack auto-apply.
- **Don't want to touch TypeScript?** [Propose a primitive](.github/ISSUE_TEMPLATE/primitive_request.yml).

---

*Built on [loop-engineering](https://github.com/cobusgreyling/loop-engineering), companion to [outerloop](https://github.com/cobusgreyling/outerloop), and the broader agentic engineering community.*