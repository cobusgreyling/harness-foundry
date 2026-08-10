# Stacks

Opinionated harness compositions built from primitives.

| Stack | Preset | Use case |
|-------|--------|----------|
| `minimal/` | `--from minimal` | Smallest reliable harness — CI smoke, exploration |
| `implementer/` | `--from implementer` | Write + recovery + evidence for feature work |
| `reviewer/` | `--from reviewer` | Read-only review loop |
| `triage/` | `--from triage` | Lightweight triage / classification |

```bash
foundry init --from implementer --name my-app
foundry init --from reviewer --name my-review
```
