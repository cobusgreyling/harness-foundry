# harness-foundry Roadmap

Executable checklist. **Platform vision (pillars 1–6):** [docs/platform-roadmap.md](./docs/platform-roadmap.md).

```
loop-engineering  →  harness-foundry  →  outerloop
   (patterns)         (runtime)          (governance)
```

---

## v0.1 ✅

- [x] Four-layer taxonomy and primitive catalogue
- [x] `foundry init`, `run`, `stack show`, `trace show`
- [x] L1 evolve reports
- [x] Monorepo + CI

## v0.2 ✅

- [x] `model/anthropic` and `model/mock` adapters
- [x] `implementer` stack preset
- [x] `foundry validate`, `primitives list`, `sessions list`
- [x] `primitive.activate` / `primitive.complete` trace events
- [x] `stack.lock` primitive digests
- [x] outerloop `EvidencePackage` emission
- [x] L2 evolve proposals
- [x] Recovery primitives
- [x] MCP stub package
- [x] npm publish pipeline + smoke test
- [x] Docs, CONTRIBUTING, issue templates

## v0.3 ✅

- [x] Implementer execution: git worktrees, test verification, recovery
- [x] Cursor / Claude Code host adapters (`foundry host integrate`)
- [x] GitHub Action: reusable foundry-gate workflow
- [x] npm publish (`@cobusgreyling/harness-foundry`)

## v0.4 — Finish the kernel (in progress)

**Pillar base:** real single-session production loop.

- [x] Real agent turn loop (model → tools → observe → budget)
- [x] Built-in tools: `read_file`, `write_file`, `list_dir`, `run_command` (sandboxed)
- [x] Enforce token + tool-call budgets from `control/token-budget-*`
- [x] Tool-aware mock + Anthropic providers (`tool_use` / tool results)
- [x] Trace events: `model.complete`, `tool.call`, `tool.result`, `budget.*`
- [ ] Land turn-loop work on `main` + green CI / demo
- [ ] OpenAI (+ OpenAI-compatible) model adapter
- [ ] Real MCP stdio transport
- [ ] Wire MCP tools into the turn loop when stack requests them
- [ ] `foundry evolve apply` (explicit human gate / `--yes` + audit)

**Ship:** npm `0.4.x`, updated QUICKSTART, demo with tool loop.

---

## v0.5 — Catalogue + composition

**Pillars:** 4 (composition), foundation for 1 (registry).

- [ ] ≥ 25 primitives across four layers (models, MCP, budgets, policy, recovery)
- [ ] Stacks: `reviewer`, `triage`, `ci-sweeper`, `mcp-worker`, promote `with-outerloop`
- [ ] `docs/primitive-spec.md` + `foundry primitives show <id>`
- [ ] Policy primitives enforced in tools / `run_command`
- [ ] Host bridge records host turns into Foundry traces
- [ ] Example: real MCP filesystem server end-to-end

**Ship:** npm `0.5.0`, showcase “compose a harness like a lockfile.”

---

## v0.6 — Registry (npm of harnesses)

**Pillar:** 1.

- [ ] Local registry + package layout for primitives/stacks
- [ ] CLI: `foundry add` / `remove` / `search` / `publish --dry-run`
- [ ] Remote install from git/npm catalogue packages
- [ ] `--frozen-lock` gate in CI / foundry-gate action
- [ ] Seed public stacks under `@cobusgreyling/*`
- [ ] LE funnel aliases resolve registry stacks

**Ship:** npm `0.6.0`, “Publish a stack” tutorial.

---

## v0.7 — Evolve that learns

**Pillars:** 3 (multi-session evolve), 5 (start: inspect/replay).

- [ ] Session index (`.foundry/sessions/index.*`)
- [ ] `foundry evolve report --since 7d` (cross-session aggregates)
- [ ] Evidence-backed L2 proposals (cite session IDs + rates)
- [ ] Apply audit trail under `.foundry/evolve/applied/`
- [ ] Guardrails schema (prep for L3)
- [ ] `foundry trace replay` narrative output

**Ship:** npm `0.7.0`, story: harness diffs with evidence.

---

## v0.8 — Control plane + L3 opt-in

**Pillar:** 2 (fleet / multi-session reliability).

- [ ] Fleet registry: register / list / status
- [ ] Collision / path-claim checks (align with outerloop coordination)
- [ ] Shared project budgets across concurrent sessions
- [ ] Role → stack mapping + handoff primitive
- [ ] L3 auto-tune **opt-in only**, default off, full audit
- [ ] Grok Build host adapter

**Ship:** npm `0.8.0`, multi-agent = multiple stacks + coordination.

---

## v0.9 — Observability product

**Pillar:** 5 (local-first).

- [ ] Session snapshot API
- [ ] `foundry dashboard` (TUI and/or local serve)
- [ ] `foundry compare` (session or stack on same fixture)
- [ ] outerloop bridge when evidence emit enabled
- [ ] Optional export adapter (JSON / OTLP-ish)

**Ship:** npm `0.9.0`. Hosted SaaS remains a non-goal.

---

## v1.0 — Harness-bench + platform GA

**Pillar:** 6 + harden 1–5.

- [ ] `foundry bench` + result schema
- [ ] Suites: `smoke`, `implementer-fixture`, `tool-use-mcp`
- [ ] Stack scoring (pass rate, turns, tokens, recoveries)
- [ ] `evolve report --from-bench`
- [ ] CI: `foundry bench --suite smoke` on every PR
- [ ] SPEC v1 freeze + migration guide + security defaults review
- [ ] npm packages `1.0.0`

**Ship:** coordinated LE + outerloop + Foundry announcement.

---

## Non-goals (through v1)

- Replacing outerloop governance
- Auto-applying stack diffs without human review (default)
- Hosted multi-tenant trace dashboard
- Becoming an opinionated graph framework (LangGraph/ADK substitute)
- Unbounded multi-agent “mega agent” instead of roles + stacks

---

## Immediate next 10 tickets

1. Land turn-loop on `main` (CI + demo)
2. OpenAI-compatible model adapter + primitive
3. MCP stdio client
4. MCP tools in turn loop
5. `foundry evolve apply --yes` + audit
6. Primitives: tool-call caps, readonly sandbox, `context/agents-md`
7. Stacks: `reviewer`, `triage`
8. Primitive spec + `primitives show`
9. Session index (evolve prep)
10. `examples/mcp-filesystem`

Details, package ownership, push cadence, and success metrics: **[docs/platform-roadmap.md](./docs/platform-roadmap.md)**.
