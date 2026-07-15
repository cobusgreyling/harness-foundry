# Primitives catalogue

Declarative, versioned building blocks for harness stacks. Each primitive maps to one of the four layers:

| Directory | Layer |
|-----------|-------|
| `interface/` | L1 — model providers |
| `context/`, `tools/` | L2 — composition |
| `control/` | L3 — execution control |
| `observability/` | L4 — reliability |

Reference a primitive in `stack.yaml`:

```yaml
layers:
  composition:
    - primitive: context/state-file
```