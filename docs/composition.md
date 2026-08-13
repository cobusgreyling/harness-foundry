# Composing primitives

## Author a primitive

Create `primitives/<category>/<name>.yaml`:

```yaml
id: control/my-budget
layer: execution
description: Custom token budget for my team
defaults:
  maxTokens: 50000
```

Project overrides go in `.foundry/primitives/`.

## Reference in a stack

```yaml
layers:
  execution:
    - primitive: control/my-budget
      config:
        maxTokens: 25000
```

## Validate

```bash
foundry validate
foundry primitives list
```

## Lock file

Each `foundry run` refreshes `.foundry/stack.lock` with primitive digests for reproducibility.

## Presets

| Preset | Use case |
|--------|----------|
| `minimal` | Smoke tests, first exploration |
| `implementer` | Write + recovery + evidence |
| `reviewer` | Read-only review + search_grep |
| `triage` | Lightweight classification |
| `ci-sweeper` | Readonly + path/command allowlists |
| `mcp-worker` | MCP stdio tool loop |
| `with-outerloop` | Implementer + evidence hook enabled |

```bash
foundry init --from implementer
```

## Evolution

1. `foundry run` → trace
2. `foundry evolve report` → L1 findings
3. `foundry evolve proposal` → L2 YAML (human reviews before apply)