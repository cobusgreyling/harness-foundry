# Story 003: minimal vs implementer

**Thesis:** Stacks are recipes, not configs. Same taxonomy, different risk posture.

| | minimal | implementer |
|---|---------|-------------|
| Model | mock | anthropic |
| Tools | state only | git worktree write |
| Recovery | none | revert-on-test-fail |
| Use case | smoke, CI | feature implementation |

```bash
foundry init --from minimal
foundry init --from implementer   # in a fresh directory
foundry stack show
```

The difference is **which primitives you compose** — not a different framework.