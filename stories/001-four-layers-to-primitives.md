# Story 001: Four layers to composable primitives

**Thesis:** Harness engineering fails when teams copy monolithic agent configs. Primitives make the four-layer taxonomy executable.

## Before

One giant prompt + tool list per project. No shared vocabulary. No trace-driven improvement.

## After

```yaml
layers:
  interface:
    - primitive: model/mock
  composition:
    - primitive: context/state-file
  execution:
    - primitive: control/token-budget-100k
  reliability:
    - primitive: observability/span-per-turn
```

Each primitive is versioned, testable, and swappable. Stacks are recipes. Traces tell you which primitive to tune next.

## Try it

```bash
foundry init && foundry run && foundry evolve report --session <id>
```