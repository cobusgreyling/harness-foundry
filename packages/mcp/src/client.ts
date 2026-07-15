export type McpTool = {
  name: string;
  description: string;
};

export type McpClientConfig = {
  serverCommand?: string;
  serverArgs?: string[];
};

export class McpClient {
  constructor(private readonly config: McpClientConfig = {}) {}

  async listTools(): Promise<McpTool[]> {
    if (!this.config.serverCommand) {
      return [
        { name: "read_file", description: "Read a file from the workspace" },
        { name: "search", description: "Search the codebase" },
      ];
    }
    return [{ name: "mcp-stub", description: `Connected via ${this.config.serverCommand}` }];
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<string> {
    if (!this.config.serverCommand) {
      return `[mcp-stub] ${name}(${JSON.stringify(args)})`;
    }
    return `[mcp] invoked ${name} via ${this.config.serverCommand}`;
  }
}