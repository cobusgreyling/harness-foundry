# outerloop adapter

Thin integration seam between harness-foundry and [outerloop](https://github.com/cobusgreyling/outerloop).

## v0.1

- `packages/emit` writes `evidence-stub.json` when `hooks/outerloop.yaml` has `enabled: true`
- Harness boundary sync planned for v0.2

## Target flow

```
foundry run  →  trace.jsonl  →  EvidencePackage  →  outerloop verdict
```