<p align="center">
  <img src="https://raw.githubusercontent.com/cobusgreyling/harness-foundry/main/docs/harness-foundry.png" alt="harness-foundry" width="720" />
</p>

# harness-foundry showcase

**Composable harness runtime for production agents.**

The missing layer between your model and reliable behaviour — with traces, evolution, and a first-class seam to [outerloop](https://github.com/cobusgreyling/outerloop) governance.

```bash
npx @cobusgreyling/harness-foundry init --from minimal
foundry validate && foundry run --goal "Hello harness"
```

[![npm](https://img.shields.io/npm/v/@cobusgreyling/harness-foundry)](https://www.npmjs.com/package/@cobusgreyling/harness-foundry)
[![CI](https://github.com/cobusgreyling/harness-foundry/actions/workflows/ci.yml/badge.svg)](https://github.com/cobusgreyling/harness-foundry/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)

→ [QUICKSTART](../QUICKSTART.md) · [README](../README.md) · [Contributing](../CONTRIBUTING.md)

---

## The problem

Most teams ship agents with monolithic prompts and host-specific configs. When something breaks, there is no shared vocabulary, no session trace, and no path from run → tune → govern.

**harness-foundry** makes harness engineering **declarative, versioned, and empirical.**

---

## Where it sits

```
loop-engineering  →  harness-foundry  →  outerloop
   (patterns)         (runtime)          (governance)
```

| Repo | You get |
|------|---------|
| [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | How to design reliable inner loops |
| **harness-foundry** | Executable primitives, sessions, traces |
| [outerloop](https://github.com/cobusgreyling/outerloop) | Evidence, verdict, answerability |

---

## One session, end to end

```
Model  →  Primitives  →  Runtime  →  Trace  →  Evidence  →  Verdict
         (stack.yaml)   (foundry)   (jsonl)   (emit hook)  (outerloop)
```

```bash
foundry init --from implementer
foundry run --goal "Implement auth middleware"
foundry trace show --session <id>
foundry evolve report --session <id>
```

Every primitive activation is recorded. Evolution starts from real runs, not guesswork.

---

## Showcase 1 — Minimal stack (60 seconds)

Smallest reliable harness. Ideal for CI smoke tests and first exploration.

```bash
npx @cobusgreyling/harness-foundry init --from minimal
foundry validate
foundry run --goal "Verify harness wiring"
foundry sessions list
```

**Stack recipe:**

| Layer | Primitive |
|-------|-----------|
| Interface | `model/mock` |
| Composition | `context/state-file` |
| Execution | `control/token-budget-100k`, `sandbox/worktree-isolated` |
| Reliability | `observability/span-per-turn`, `emit/outerloop-evidence` |

→ [hello-harness example](../examples/hello-harness/)

---

## Showcase 2 — Implementer stack (production-shaped)

Read-write loops with git worktrees, test recovery, and evidence emission.

```bash
foundry init --from implementer --name my-app
foundry run --goal "Implement feature X" --turns 2
foundry evolve proposal --session <id>   # L2 stack diff — human reviews before apply
```

**Stack recipe:**

```yaml
layers:
  interface:
    - primitive: model/anthropic
  composition:
    - primitive: context/state-file
    - primitive: tools/git-worktree-write
  execution:
    - primitive: sandbox/worktree-isolated
    - primitive: control/token-budget-100k
  reliability:
    - primitive: observability/span-per-turn
    - primitive: recovery/revert-on-test-fail
    - primitive: emit/outerloop-evidence
```

→ [implementer preset](../stacks/implementer/)

---

## Showcase 3 — Full stack with outerloop (flagship)

Harness runtime + human governance in one flow.

```bash
npx @cobusgreyling/outerloop init
npx @cobusgreyling/harness-foundry init --from implementer

# enable .foundry/hooks/outerloop.yaml
foundry run --goal "Implement with evidence"
outerloop verdict review <evidence-id>
outerloop ledger why <evidence-id>
```

| Step | Artifact |
|------|----------|
| Session | `.foundry/sessions/<id>/trace.jsonl` |
| Evidence | `.foundry/sessions/<id>/evidence.json` |
| Verdict | `.outerloop/verdicts/` |
| Answerability | `outerloop ledger why <id>` |

→ [with-outerloop walkthrough](../examples/with-outerloop/) · `pnpm demo:outerloop` from repo root

---

## Showcase 4 — IDE host adapters

Run the same stack inside Cursor or Claude Code — versioned harness config, not a one-off prompt.

```bash
foundry host integrate cursor      # or claude-code
foundry host detect
foundry run --goal "Implement feature X" --host cursor
```

Host detection picks `auto | cursor | claude-code | standalone`. Traces look the same regardless of host.

---

## Showcase 5 — Trace-driven evolution

Turn runs into stack improvements — with human gates.

```bash
foundry run --goal "Implement auth middleware"
foundry evolve report --session <id>     # L1: diagnose from trace
foundry evolve proposal --session <id>   # L2: propose stack diff
# Human reviews .foundry/evolve/proposals/ before editing stack.yaml
```

→ [Story 002: Trace-driven evolution](../stories/002-trace-driven-evolution.md) · [FOUNDRY.md](../FOUNDRY.md)

---

## Primitive catalogue (v0.4)

| Layer | Primitives |
|-------|------------|
| **Interface** | `model/mock`, `model/anthropic` |
| **Composition** | `context/state-file`, `tools/git-worktree-write` |
| **Execution** | `control/token-budget-100k`, `sandbox/worktree-isolated` |
| **Reliability** | `observability/span-per-turn`, `emit/outerloop-evidence`, `recovery/revert-on-test-fail`, `recovery/narrow-scope` |

Browse all: `foundry primitives list` · [Propose a new primitive](https://github.com/cobusgreyling/harness-foundry/issues/new?template=primitive_request.yml)

---

## CI gate

Validate stacks in pull requests:

```yaml
jobs:
  foundry-gate:
    uses: cobusgreyling/harness-foundry/.github/workflows/foundry-gate.yml@main
```

Pair with [outerloop evidence-gate](https://github.com/cobusgreyling/outerloop/blob/main/docs/github-action.md) for governance before merge.

→ [docs/github-action.md](./github-action.md)

---

## vs alternatives

| Approach | Strength | Gap foundry fills |
|----------|----------|-------------------|
| Raw Agent SDK | Model access | No composable taxonomy, traces, or governance seam |
| LangGraph / ADK | Graph orchestration | Graph-first, not primitive-first harness engineering |
| Cursor / Claude Code | IDE agents | Host-specific; hard to version and evolve |
| loop-engineering | Loop patterns | Patterns without executable runtime |
| outerloop | Evidence & verdicts | Governance without inner-loop execution |

→ [Full comparison](./vs-alternatives.md)

---

## Stories

Narrative walkthroughs — before/after, not just API docs.

| Story | Topic |
|-------|-------|
| [001](../stories/001-four-layers-to-primitives.md) | Four layers → composable primitives |
| [002](../stories/002-trace-driven-evolution.md) | Trace-driven harness evolution |
| [003](../stories/003-minimal-vs-implementer.md) | Minimal vs implementer presets |

---

## Live demo (terminal)

Clone and run:

```bash
git clone https://github.com/cobusgreyling/harness-foundry.git
cd harness-foundry && pnpm install && pnpm build && pnpm demo
```

Full transcript: [docs/demo-terminal.txt](./demo-terminal.txt)

---

## Get involved

- [Contributor start here](https://github.com/cobusgreyling/harness-foundry/discussions/12)
- [Good first issues](./good-first-issues.md)
- [ROADMAP](../ROADMAP.md) — v0.4: OpenAI adapter, MCP stdio, `evolve apply`

---

<p align="center">
  <strong>Own the runtime. Trace the runs. Govern the outcomes.</strong><br/>
  <a href="https://github.com/cobusgreyling/harness-foundry">Star on GitHub</a> ·
  <a href="https://www.npmjs.com/package/@cobusgreyling/harness-foundry">npm</a> ·
  <a href="https://github.com/cobusgreyling/outerloop">outerloop</a>
</p>