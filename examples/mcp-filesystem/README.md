# mcp-filesystem example

Wire a real MCP stdio server into the turn loop.

```yaml
# .foundry/stack.yaml (composition layer)
- primitive: tools/mcp-stdio
  config:
    serverCommand: npx
    serverArgs: ["-y", "@modelcontextprotocol/server-filesystem", "."]
```

```bash
foundry validate
foundry run --goal "Use MCP tools to list available tools and summarize" --turns 6
```

Without `serverCommand`, `tools/mcp-stdio` runs in **stub mode** (default tools for demos/CI).
