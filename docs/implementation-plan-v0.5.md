# Implementation plan — v0.5 production sprint (weeks 1–12)

Maps the 90-day credibility → GA path into a single shippable release.

## Scope delivered

| Weeks | Theme | Deliverables |
|-------|--------|--------------|
| 1–3 | Credibility | Real turn loop (landed), enforced budgets, OpenAI-compatible provider, MCP stdio MVP, MCP tools in loop, runnable examples + CI |
| 4–6 | Evolution | `foundry evolve apply --yes`, richer L1 reports, trace event schema docs |
| 7–9 | Adoption | Windows/PowerShell QUICKSTART, primitive plugin registry, expanded foundry-gate |
| 10–12 | Narrative | SPEC v0.5, ROADMAP update, case study, version **0.5.0** |

## Package ownership

| Package | Changes |
|---------|---------|
| `interface` | `model/openai`, `model/openai-compatible` |
| `mcp` | Real stdio JSON-RPC client |
| `runtime` | Plugin registry, MCP tool merge, default max turns |
| `evolve` | Apply + audit trail; richer reports |
| `cli` | `evolve apply`, `init --dry-run`, `primitives show` |
| `core` | `evolveAppliedDir`, trace schema notes |
| docs / examples / stacks / primitives | Catalog + fixtures + gate |

## Non-goals (unchanged)

- Hosted dashboard
- Auto-apply without human gate
- Replacing outerloop

## Success criteria

1. `pnpm build && pnpm test && pnpm demo` green
2. `foundry run` with mock exercises tool loop (trace has `tool.call` / `tool.result`)
3. MCP stdio can list+call when `npx` server is available
4. `evolve apply --yes` mutates stack.yaml with audit file
5. npm packages published as `0.5.0`
