# Changelog

All notable changes to harness-foundry are documented here. Package-level changelogs live under `packages/*/CHANGELOG.md`.

## Unreleased

## v0.5.0 — 2026-08-10

**Production sprint (weeks 1–12): real tool loop, OpenAI, MCP stdio, evolve apply.**

### Runtime (W1–3)

- Multi-turn agent loop: model → tools → observe → budget (default 8 turns)
- Built-in tools: `read_file`, `write_file`, `list_dir`, `run_command` (sandboxed)
- Enforced token + tool-call budgets (`budget.check` / `budget.exceeded`)
- OpenAI + OpenAI-compatible model adapters (`model/openai`, `model/openai-compatible`)
- Real MCP stdio JSON-RPC client; wire into turn loop via `tools/mcp-stdio`
- Runnable examples: `hello-harness`, `with-outerloop`, `mcp-filesystem`

### Evolution (W4–6)

- `foundry evolve apply --proposal <id> --yes` with audit under `.foundry/evolve/applied/`
- Richer L1 reports: failure taxonomy, usage, primitive heatmap
- [docs/trace-events.md](docs/trace-events.md)

### Adoption (W7–9)

- [QUICKSTART.windows.md](QUICKSTART.windows.md)
- Primitive plugin registry (`registerPrimitiveHandler`)
- `foundry init --dry-run`, `foundry primitives show`
- Expanded foundry-gate (session smoke + example fixtures)
- Stacks: `reviewer`, `triage`; primitives: tool-call-cap, agents-md, mcp-stdio

### Narrative (W10–12)

- SPEC v0.5, case study, implementation plan
- npm packages **0.5.0**

## v0.4.0 — 2026-07-16

**Implementer execution, host adapters, npm publish.**

### Runtime

- Implementer stack: git worktrees, test verification, recovery primitives
- Cursor and Claude Code host adapters (`foundry host integrate`, `--host`)
- Session bridge with host detection (`foundry host detect`)

### Governance seam

- outerloop `EvidencePackage` emission via `emit/outerloop-evidence` primitive
- Flagship [with-outerloop example](examples/with-outerloop/)

### Contributor experience

- Expanded CONTRIBUTING, CODE_OF_CONDUCT, PR template
- Good-first issues filed on GitHub
- GitHub Discussions enabled
- Terminal demo transcript in README

### Ecosystem

```
loop-engineering  →  harness-foundry  →  outerloop
   (patterns)         (runtime)          (governance)
```

## v0.3.0

- Primitives catalogue, model adapters (mock, anthropic)
- `foundry validate`, `primitives list`, `sessions list`
- L1 evolve reports and L2 proposals
- MCP stub package, foundry-gate GitHub Action

## v0.1.0

- Four-layer taxonomy
- `foundry init`, `run`, `stack show`, `trace show`
- Monorepo + CI