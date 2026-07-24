# Changelog

All notable changes to harness-foundry are documented here. Package-level changelogs live under `packages/*/CHANGELOG.md`.

## Unreleased

### Runtime — real agent turn loop

- Session runner uses a true model ↔ tool loop (not sequential primitive pings)
- Built-in sandboxed tools: `read_file`, `write_file`, `list_dir`, `run_command`
- Enforced token + tool-call budgets from `control/token-budget-*`
- Mock + Anthropic providers support tool calls / tool results
- New trace events: `model.complete`, `tool.call`, `tool.result`, `budget.check`, `budget.exceeded`

### Ecosystem funnel

- `foundry init --from` accepts loop-engineering pattern names and `loop-engineering:<pattern>` aliases (e.g. `daily-triage` → minimal, `ci-sweeper` → implementer)
- Documented LE one-command path: `npx @cobusgreyling/loop-init . --with-foundry`

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