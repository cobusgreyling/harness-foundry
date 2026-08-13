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

## Catalogue highlights (v0.5)

| Id | Layer |
|----|--------|
| `model/mock` | interface |
| `model/anthropic` | interface |
| `model/openai` | interface |
| `model/openai-compatible` | interface |
| `model/grok` | interface |
| `context/state-file` | composition |
| `context/agents-md` | composition |
| `context/skills-dir` | composition |
| `memory/file-log` | composition |
| `tools/git-worktree-write` | composition |
| `tools/mcp-stdio` | composition |
| `tools/search-grep` | composition |
| `control/token-budget-100k` | execution |
| `control/token-budget-50k` | execution |
| `control/tool-call-cap` | execution |
| `control/network-deny` | execution |
| `sandbox/worktree-isolated` | execution |
| `sandbox/readonly` | execution |
| `policy/path-allowlist` | execution |
| `policy/command-allowlist` | execution |
| `policy/secret-scrub` | execution |
| `recovery/*` | reliability |
| `observability/*` / `emit/*` | reliability |

See [docs/primitive-spec.md](../docs/primitive-spec.md).
