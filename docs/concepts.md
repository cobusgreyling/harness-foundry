# Core concepts (5-minute read)

harness-foundry is the **runtime layer** between a model and reliable agent behaviour. You compose harnesses from primitives; the runtime runs sessions and records what happened.

## The four layers

```
┌─────────────────────────────────────────────────────────┐
│ L4 Reliability   traces · recovery · evidence · evolve  │
├─────────────────────────────────────────────────────────┤
│ L3 Execution     turn loop · sandbox · budgets          │
├─────────────────────────────────────────────────────────┤
│ L2 Composition   tools · skills · context · memory      │
├─────────────────────────────────────────────────────────┤
│ L1 Interface     model provider · streaming             │
└─────────────────────────────────────────────────────────┘
```

| Layer | Question it answers |
|-------|---------------------|
| Interface | *Which model, how do messages flow?* |
| Composition | *What can the agent see and use?* |
| Execution | *How does the loop run, safely?* |
| Reliability | *How do we observe, recover, and improve?* |

## Primitives vs stacks

- **Primitive** — smallest reusable unit (`context/state-file`, `control/token-budget-100k`)
- **Stack** — curated composition for a use case (`stacks/minimal/`)

Reference primitives in `.foundry/stack.yaml`:

```yaml
layers:
  reliability:
    - primitive: observability/span-per-turn
```

## Session lifecycle

```
foundry run  →  resolve stack  →  turns  →  trace.jsonl  →  evolve report
```

Each session writes:

- `manifest.json` — metadata
- `trace.jsonl` — append-only events

## Relationship to outerloop

| harness-foundry | outerloop |
|-----------------|-----------|
| Runs the agent | Reviews what the agent produced |
| Emits traces + evidence hooks | Packages evidence, captures verdict |
| Composes runtime primitives | Owns harness *boundary decisions* |

Enable the seam in `.foundry/hooks/outerloop.yaml` when you adopt outerloop governance.

## Further reading

- [SPEC.md](../SPEC.md) — full specification
- [primitives/README.md](../primitives/README.md) — primitive catalogue
- [stacks/README.md](../stacks/README.md) — opinionated compositions