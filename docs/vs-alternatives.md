# vs alternatives

| Approach | Strength | Gap harness-foundry fills |
|----------|----------|---------------------------|
| **Raw Agent SDK** (OpenAI, Anthropic) | Model access | No composable harness taxonomy, traces, or governance seam |
| **LangGraph / ADK** | Graph orchestration | Opinionated graphs, not primitive-first harness engineering |
| **Cursor / Claude Code** | IDE-integrated agents | Host-specific; hard to version and evolve harness config |
| **loop-engineering** | Loop design patterns | Patterns without executable runtime primitives |
| **outerloop** | Evidence, verdict, answerability | Governance without inner-loop execution |

**harness-foundry** is the runtime layer: declarative primitives, session traces, trace-driven evolution, and a first-class seam to outerloop.

```
Model SDK  →  [harness-foundry]  →  outerloop verdict
              primitives + traces
```