# Examples

→ **[Showcase](../docs/showcase.md)** — curated demos and stack walkthroughs

| Example | Description |
|---------|-------------|
| [**with-outerloop**](./with-outerloop/) | **Flagship** — full stack: harness → evidence → verdict |
| [hello-harness](./hello-harness/) | Minimal init + run walkthrough |
| [mcp-filesystem](./mcp-filesystem/) | Real MCP stdio filesystem server |
| [trace-evolution](./trace-evolution/) | L1 report → L2 proposal flow |

## Quick start

**Full stack (recommended):**

```bash
cd examples/with-outerloop
# follow README.md
```

**Minimal smoke test:**

```bash
cd examples/hello-harness
npx @cobusgreyling/harness-foundry init --from minimal
foundry run --goal "Hello harness"
```

**From repo root:**

```bash
pnpm demo              # minimal harness demo
pnpm demo:outerloop    # harness + outerloop evidence flow
```