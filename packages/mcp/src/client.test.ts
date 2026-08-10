import { describe, expect, it } from "vitest";
import { McpClient } from "./client.js";

describe("McpClient", () => {
  it("lists default stub tools without serverCommand", async () => {
    const client = new McpClient();
    const tools = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(["read_file", "search"]);
  });

  it("callTool returns stub payload without serverCommand", async () => {
    const client = new McpClient();
    const out = await client.callTool("read_file", { path: "a.txt" });
    expect(out).toContain("mcp-stub");
    expect(out).toContain("read_file");
  });

  it("stdio mock server: listTools + callTool via node -e", async () => {
    // Minimal JSON-RPC MCP-like server over stdin/stdout
    const serverScript = `
const rl = require('readline').createInterface({ input: process.stdin });
rl.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.method === 'initialize') {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0', id: msg.id,
      result: { protocolVersion: '2024-11-05', capabilities: { tools: {} },
        serverInfo: { name: 'test', version: '0.0.1' } }
    }) + '\\n');
  } else if (msg.method === 'notifications/initialized') {
    // no-op
  } else if (msg.method === 'tools/list') {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0', id: msg.id,
      result: { tools: [{ name: 'echo', description: 'Echo args',
        inputSchema: { type: 'object', properties: { text: { type: 'string' } } } }] }
    }) + '\\n');
  } else if (msg.method === 'tools/call') {
    const text = (msg.params && msg.params.arguments && msg.params.arguments.text) || '';
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0', id: msg.id,
      result: { content: [{ type: 'text', text: 'echo:' + text }] }
    }) + '\\n');
  }
});
`;

    const client = new McpClient({
      serverCommand: process.execPath,
      serverArgs: ["-e", serverScript],
      timeoutMs: 5000,
    });

    try {
      const tools = await client.listTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]?.name).toBe("echo");
      const result = await client.callTool("echo", { text: "hi" });
      expect(result).toBe("echo:hi");
    } finally {
      await client.close();
    }
  });
});
