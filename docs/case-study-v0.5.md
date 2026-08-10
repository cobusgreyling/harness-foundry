# Case study: self-hosting foundry on harness-foundry (v0.5)

## Setup

This repository dogsfoods under `.foundry/` with a minimal stack and mock (or Anthropic) model.

## Session pattern

1. `foundry validate` — stack + catalogue
2. `foundry run --goal "list the directory" --turns 4` — real tool loop
3. `foundry trace show --session <id>` — inspect `model.complete` / `tool.*` / `budget.*`
4. `foundry evolve report --session <id>` — failure taxonomy + usage + heatmap
5. `foundry evolve proposal --session <id>` — L2 additions (e.g. tool-call-cap)
6. `foundry evolve apply --proposal <id> --yes` — human-gated stack mutation + audit under `.foundry/evolve/applied/`

## Observed value (framework)

| Before | After v0.5 |
|--------|------------|
| Session activated primitives once | Multi-turn model↔tool loop |
| Token budget was a log line | Enforced caps with `budget.exceeded` |
| MCP stub only | Optional real stdio JSON-RPC |
| Evolve stopped at proposal | Apply with audit trail |
| Anthropic-only (real) | OpenAI + OpenAI-compatible |

## Reproducing

```bash
pnpm build && pnpm demo
pnpm demo:examples   # if script present — else examples/hello-harness
```
