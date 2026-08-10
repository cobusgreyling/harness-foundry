import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";

export type McpTool = {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
};

export type McpClientConfig = {
  /** Command to launch MCP server (e.g. npx, node, python). */
  serverCommand?: string;
  serverArgs?: string[];
  /** Soft timeout for a single RPC call (ms). */
  timeoutMs?: number;
  env?: Record<string, string>;
};

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id?: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

/**
 * MCP client with:
 * - default stub tools when no serverCommand (tests / dry demos)
 * - real JSON-RPC over stdio when serverCommand is set
 */
export class McpClient {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (v: JsonRpcResponse) => void; reject: (e: Error) => void }
  >();
  private started = false;
  private stderrBuf = "";

  constructor(private readonly config: McpClientConfig = {}) {}

  get isConnected(): boolean {
    return this.proc !== null && !this.proc.killed;
  }

  async connect(): Promise<void> {
    if (!this.config.serverCommand) return;
    if (this.proc) return;

    this.proc = spawn(this.config.serverCommand, this.config.serverArgs ?? [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...this.config.env },
    });

    this.proc.on("error", (err) => {
      for (const [, p] of this.pending) p.reject(err);
      this.pending.clear();
    });

    this.proc.stderr.on("data", (chunk: Buffer) => {
      this.stderrBuf = `${this.stderrBuf}${chunk.toString("utf8")}`.slice(-4000);
    });

    const rl = createInterface({ input: this.proc.stdout });
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const msg = JSON.parse(trimmed) as JsonRpcResponse & { method?: string };
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const p = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          p.resolve(msg);
        }
        // notifications ignored
      } catch {
        // ignore non-JSON lines
      }
    });

    this.proc.on("exit", () => {
      this.proc = null;
      this.started = false;
      for (const [, p] of this.pending) {
        p.reject(new Error(`MCP server exited. stderr: ${this.stderrBuf.slice(0, 500)}`));
      }
      this.pending.clear();
    });

    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "harness-foundry", version: "0.5.0" },
    });

    // notifications/initialized (no response expected)
    this.notify("notifications/initialized", {});
    this.started = true;
  }

  async close(): Promise<void> {
    if (!this.proc) return;
    const proc = this.proc;
    this.proc = null;
    this.started = false;
    for (const [, p] of this.pending) p.reject(new Error("MCP client closed"));
    this.pending.clear();
    proc.stdin.end();
    proc.kill("SIGTERM");
  }

  async listTools(): Promise<McpTool[]> {
    if (!this.config.serverCommand) {
      return [
        { name: "read_file", description: "Read a file from the workspace" },
        { name: "search", description: "Search the codebase" },
      ];
    }

    await this.connect();
    const res = await this.request("tools/list", {});
    if (res.error) {
      throw new Error(`MCP tools/list error: ${res.error.message}`);
    }
    const result = res.result as { tools?: Array<Record<string, unknown>> } | undefined;
    const tools = result?.tools ?? [];
    return tools.map((t) => ({
      name: String(t.name ?? "unknown"),
      description: String(t.description ?? ""),
      inputSchema: (t.inputSchema as Record<string, unknown> | undefined) ?? undefined,
    }));
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<string> {
    if (!this.config.serverCommand) {
      return `[mcp-stub] ${name}(${JSON.stringify(args)})`;
    }

    await this.connect();
    const res = await this.request("tools/call", { name, arguments: args });
    if (res.error) {
      throw new Error(`MCP tools/call ${name}: ${res.error.message}`);
    }

    const result = res.result as
      | { content?: Array<{ type?: string; text?: string }>; isError?: boolean }
      | undefined;

    const texts = (result?.content ?? [])
      .filter((c) => c.type === "text" || c.text)
      .map((c) => c.text ?? "")
      .join("\n");

    if (result?.isError) {
      return texts || `MCP tool ${name} returned isError`;
    }
    return texts || JSON.stringify(result ?? {});
  }

  private notify(method: string, params: unknown): void {
    if (!this.proc?.stdin.writable) return;
    const payload = JSON.stringify({ jsonrpc: "2.0", method, params });
    this.proc.stdin.write(`${payload}\n`);
  }

  private request(method: string, params: unknown): Promise<JsonRpcResponse> {
    if (!this.proc?.stdin.writable) {
      return Promise.reject(new Error("MCP process not running"));
    }

    const id = this.nextId++;
    const req: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    const timeoutMs = this.config.timeoutMs ?? 30_000;

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP RPC timeout (${method}) after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });

      this.proc!.stdin.write(`${JSON.stringify(req)}\n`);
    });
  }
}
