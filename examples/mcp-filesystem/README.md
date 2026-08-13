# mcp-filesystem example

Wire a real MCP stdio server into the turn loop. A ready stack lives in [`stack.yaml`](./stack.yaml).

```bash
# From this directory (after foundry init, or copy stack.yaml into .foundry/)
npx @cobusgreyling/harness-foundry init --from mcp-worker
# Then merge the serverCommand from stack.yaml into .foundry/stack.yaml

foundry validate
foundry run --goal "Use MCP tools to list available tools and summarize" --turns 6
```

The composition layer:

```yaml
- primitive: tools/mcp-stdio
  config:
    serverCommand: npx
    serverArgs: ["-y", "@modelcontextprotocol/server-filesystem", "."]
```

Without `serverCommand`, `tools/mcp-stdio` runs in **stub mode** (default tools for demos/CI).
