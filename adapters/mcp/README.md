# MCP adapter

Implemented in `@cobusgreyling/harness-foundry-mcp`.

## Modes

| Mode | When | Behavior |
|------|------|----------|
| Stub | no `serverCommand` | Default tool names for demos/CI |
| Stdio | `serverCommand` set | JSON-RPC over child process stdin/stdout (`initialize`, `tools/list`, `tools/call`) |

## Stack

```yaml
layers:
  composition:
    - primitive: tools/mcp-stdio
      config:
        serverCommand: npx
        serverArgs: ["-y", "@modelcontextprotocol/server-filesystem", "."]
```

## Programmatic

```ts
import { McpClient } from "@cobusgreyling/harness-foundry-mcp";

const client = new McpClient({
  serverCommand: "npx",
  serverArgs: ["-y", "my-mcp-server"],
});
const tools = await client.listTools();
const result = await client.callTool(tools[0].name, {});
await client.close();
```

MCP tools are merged into the agent turn loop when the primitive is on the stack.
