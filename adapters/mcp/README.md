# MCP adapter

Implemented in `@cobusgreyling/harness-foundry-mcp`.

v0.2 ships a stub `McpClient` with default tools. v0.3 adds stdio transport.

```ts
import { McpClient } from "@cobusgreyling/harness-foundry-mcp";

const client = new McpClient({ serverCommand: "npx", serverArgs: ["-y", "my-mcp-server"] });
const tools = await client.listTools();
```