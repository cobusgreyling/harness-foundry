# Architecture

```mermaid
flowchart TB
  subgraph L1["L1 Interface"]
    M[model/mock]
    A[model/anthropic]
  end
  subgraph L2["L2 Composition"]
    C[context/state-file]
    T[tools/git-worktree-write]
  end
  subgraph L3["L3 Execution"]
    S[sandbox/worktree-isolated]
    B[control/token-budget-100k]
  end
  subgraph L4["L4 Reliability"]
    O[observability/span-per-turn]
    R[recovery/*]
    E[emit/outerloop-evidence]
  end

  Stack[stack.yaml] --> Compose[compose]
  Compose --> Runtime[runtime]
  Runtime --> Trace[trace.jsonl]
  Trace --> Evolve[evolve]
  Runtime --> Emit[emit → EvidencePackage]
```

## Packages

| Package | Layer | Role |
|---------|-------|------|
| `interface` | L1 | Model providers |
| `compose` | L2 | Stack builder, catalogue |
| `mcp` | L2 | Tool dispatch stub |
| `runtime` | L3 | Session + turn loop |
| `trace` | L4 | Event recorder |
| `evolve` | L4 | L1 reports, L2 proposals |
| `emit` | L4 | outerloop evidence seam |
| `cli` | — | `foundry` commands |

## Ecosystem

```
loop-engineering  →  harness-foundry  →  outerloop
   (patterns)         (runtime)          (governance)
```

See [vs-alternatives.md](./vs-alternatives.md) for positioning against raw agent SDKs.