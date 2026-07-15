# Story 002: Trace-driven harness evolution

**Thesis:** You cannot tune what you cannot see. Traces turn harness engineering into an empirical discipline.

## Flow

```bash
foundry run --goal "Implement auth middleware" --turns 2
foundry evolve report --session <id>    # L1: diagnose
foundry evolve proposal --session <id>  # L2: propose stack diff
```

## What the trace captures

- `primitive.activate` / `primitive.complete` per layer
- `recovery.triggered` when failures occur
- `evidence.emitted` when outerloop hook is enabled

## Human gate

L2 proposals land in `.foundry/evolve/proposals/`. Review before editing `stack.yaml`. See [FOUNDRY.md](../FOUNDRY.md).