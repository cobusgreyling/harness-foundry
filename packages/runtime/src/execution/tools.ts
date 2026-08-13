import { execFile } from "node:child_process";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ToolCall, ToolDefinition } from "@cobusgreyling/harness-foundry-interface";
import type { McpClient } from "@cobusgreyling/harness-foundry-mcp";
import { commandAllowed, maybeScrub, pathAllowed } from "./policy.js";
import type { SessionRuntime } from "./runtime-state.js";

const execFileAsync = promisify(execFile);

export type ToolExecutionContext = {
  projectRoot: string;
  runtime: SessionRuntime;
};

export type ToolExecutionResult = {
  ok: boolean;
  output: string;
};

const BUILTIN_TOOLS: ToolDefinition[] = [
  {
    name: "read_file",
    description: "Read a UTF-8 text file relative to the session workspace",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from workspace root" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write a UTF-8 text file relative to the session workspace (sandboxed)",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from workspace root" },
        content: { type: "string", description: "Full file contents to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_dir",
    description: "List entries in a directory relative to the session workspace",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative directory path (default .)" },
      },
    },
  },
  {
    name: "run_command",
    description: "Run a shell command in the session workspace (no network assumed)",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
      },
      required: ["command"],
    },
  },
];

const SEARCH_GREP_TOOL: ToolDefinition = {
  name: "search_grep",
  description: "Search workspace files for a regex/string and return matching lines",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Regex or literal substring to search for" },
      path: { type: "string", description: "Relative directory or file to search (default .)" },
    },
    required: ["query"],
  },
};

export function listBuiltinTools(options?: {
  writeEnabled?: boolean;
  extra?: Iterable<string>;
}): ToolDefinition[] {
  let tools = [...BUILTIN_TOOLS];
  if (options?.writeEnabled === false) {
    tools = tools.filter((t) => t.name !== "write_file");
  }
  const extra = new Set(options?.extra ?? []);
  if (extra.has("search_grep") && !tools.some((t) => t.name === "search_grep")) {
    tools.push(SEARCH_GREP_TOOL);
  }
  return tools;
}

/** Merge built-in tools with MCP tools (MCP names are prefixed `mcp__` when they collide). */
export function mergeToolDefinitions(
  builtin: ToolDefinition[],
  mcpTools: ToolDefinition[],
): ToolDefinition[] {
  const names = new Set(builtin.map((t) => t.name));
  const merged = [...builtin];
  for (const t of mcpTools) {
    if (names.has(t.name)) {
      const renamed = { ...t, name: `mcp__${t.name}` };
      merged.push(renamed);
      names.add(renamed.name);
    } else {
      merged.push(t);
      names.add(t.name);
    }
  }
  return merged;
}

export async function loadMcpToolDefinitions(client: McpClient): Promise<ToolDefinition[]> {
  const tools = await client.listTools();
  return tools.map((t) => ({
    name: t.name,
    description: t.description || `MCP tool ${t.name}`,
    parameters: t.inputSchema ?? {
      type: "object",
      properties: {},
      additionalProperties: true,
    },
  }));
}

function workspaceRoot(ctx: ToolExecutionContext): string {
  return ctx.runtime.worktreePath ?? ctx.projectRoot;
}

function resolveSafePath(root: string, relative: string): string {
  const cleaned = relative.replace(/^\.\//, "");
  if (path.isAbsolute(cleaned) || cleaned.split(/[/\\]/).includes("..")) {
    throw new Error(`Path escapes workspace: ${relative}`);
  }
  const resolved = path.resolve(root, cleaned);
  const normalizedRoot = path.resolve(root);
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
    throw new Error(`Path escapes workspace: ${relative}`);
  }
  return resolved;
}

function assertPathPolicy(ctx: ToolExecutionContext, relative: string): void {
  const rel = relative === "" ? "." : relative;
  if (!pathAllowed(ctx.runtime.policy, rel)) {
    throw new Error(`Path not in allowlist: ${rel}`);
  }
}

function finish(ctx: ToolExecutionContext, result: ToolExecutionResult): ToolExecutionResult {
  return { ...result, output: maybeScrub(ctx.runtime.policy, result.output) };
}

async function readFileTool(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const rel = String(args.path ?? "");
  if (!rel) return { ok: false, output: "read_file requires path" };
  try {
    assertPathPolicy(ctx, rel);
    const full = resolveSafePath(workspaceRoot(ctx), rel);
    const content = await fs.readFile(full, "utf8");
    const sliced = content.length > 32_000 ? `${content.slice(0, 32_000)}\n…[truncated]` : content;
    return { ok: true, output: sliced };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

async function writeFileTool(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  if (!ctx.runtime.writeEnabled) {
    return { ok: false, output: "write_file disabled (no write tools in stack composition)" };
  }
  const rel = String(args.path ?? "");
  const content = String(args.content ?? "");
  if (!rel) return { ok: false, output: "write_file requires path" };
  if (ctx.runtime.policy.readonly) {
    return { ok: false, output: "write_file disabled (sandbox/readonly)" };
  }
  try {
    assertPathPolicy(ctx, rel);
    const full = resolveSafePath(workspaceRoot(ctx), rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf8");
    return { ok: true, output: `Wrote ${rel} (${content.length} bytes)` };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

async function listDirTool(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const rel = String(args.path ?? ".");
  try {
    assertPathPolicy(ctx, rel === "" ? "." : rel);
    const full = resolveSafePath(workspaceRoot(ctx), rel === "" ? "." : rel);
    const entries = await fs.readdir(full, { withFileTypes: true });
    const lines = entries
      .slice(0, 200)
      .map((e) => `${e.isDirectory() ? "d" : "f"} ${e.name}`)
      .join("\n");
    return { ok: true, output: lines || "(empty)" };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

async function runCommandTool(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const command = String(args.command ?? "").trim();
  if (!command) return { ok: false, output: "run_command requires command" };

  const allowed = commandAllowed(ctx.runtime.policy, command);
  if (!allowed.ok) {
    return { ok: false, output: allowed.reason ?? "Command blocked by sandbox policy" };
  }

  const cwd = workspaceRoot(ctx);
  const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
  const shellFlag = process.platform === "win32" ? "/c" : "-c";

  try {
    const { stdout, stderr } = await execFileAsync(shell, [shellFlag, command], {
      cwd,
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, CI: "true" },
    });
    const output = `${stdout}${stderr}`.trim().slice(0, 8000) || "(no output)";
    return { ok: true, output };
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    const output =
      `${execError.stdout ?? ""}${execError.stderr ?? ""}${execError.message ?? ""}`.trim();
    return { ok: false, output: output.slice(0, 8000) || "Command failed" };
  }
}

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "coverage", ".foundry"]);
const SKIP_FILE = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|zip|gz|br|wasm|mp4|mp3|bin)$/i;

async function searchGrepTool(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const query = String(args.query ?? args.pattern ?? "");
  const rel = String(args.path ?? ".");
  if (!query) return { ok: false, output: "search_grep requires query" };

  let regex: RegExp;
  try {
    regex = new RegExp(query, "i");
  } catch {
    regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const matches: string[] = [];
  const root = workspaceRoot(ctx);

  async function walk(dir: string, depth: number): Promise<void> {
    if (matches.length >= 50 || depth > 8) return;
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (matches.length >= 50) return;
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const relPath = path.relative(root, full);
      if (!pathAllowed(ctx.runtime.policy, relPath)) continue;
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile() || SKIP_FILE.test(entry.name)) continue;
      try {
        const content = await fs.readFile(full, "utf8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i += 1) {
          if (regex.test(lines[i] ?? "")) {
            matches.push(`${relPath}:${i + 1}:${(lines[i] ?? "").slice(0, 200)}`);
            if (matches.length >= 50) return;
          }
        }
      } catch {
        // skip unreadable / binary
      }
    }
  }

  try {
    assertPathPolicy(ctx, rel === "" ? "." : rel);
    const start = resolveSafePath(root, rel === "" ? "." : rel);
    const stat = await fs.stat(start);
    if (stat.isFile()) {
      const content = await fs.readFile(start, "utf8");
      const lines = content.split("\n");
      const relPath = path.relative(root, start);
      for (let i = 0; i < lines.length; i += 1) {
        if (regex.test(lines[i] ?? "")) {
          matches.push(`${relPath}:${i + 1}:${(lines[i] ?? "").slice(0, 200)}`);
          if (matches.length >= 50) break;
        }
      }
    } else {
      await walk(start, 0);
    }
    return { ok: true, output: matches.join("\n") || "(no matches)" };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

export async function executeToolCall(
  call: ToolCall,
  ctx: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const name = call.name.startsWith("mcp__") ? call.name.slice("mcp__".length) : call.name;

  // MCP tools (exact name or de-prefixed)
  if (ctx.runtime.mcpClient) {
    const mcpNames = ctx.runtime.mcpToolNames ?? new Set<string>();
    if (mcpNames.has(name) || call.name.startsWith("mcp__")) {
      try {
        const output = await ctx.runtime.mcpClient.callTool(name, call.arguments ?? {});
        return finish(ctx, { ok: true, output });
      } catch (error) {
        return finish(ctx, {
          ok: false,
          output: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  let result: ToolExecutionResult;
  switch (call.name) {
    case "read_file":
      result = await readFileTool(ctx, call.arguments);
      break;
    case "write_file":
      result = await writeFileTool(ctx, call.arguments);
      break;
    case "list_dir":
      result = await listDirTool(ctx, call.arguments);
      break;
    case "run_command":
      result = await runCommandTool(ctx, call.arguments);
      break;
    case "search_grep":
      result = await searchGrepTool(ctx, call.arguments);
      break;
    default:
      result = { ok: false, output: `Unknown tool: ${call.name}` };
  }
  return finish(ctx, result);
}
