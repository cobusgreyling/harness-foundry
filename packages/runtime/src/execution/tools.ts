import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ToolCall, ToolDefinition } from "@cobusgreyling/harness-foundry-interface";
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

export function listBuiltinTools(options?: { writeEnabled?: boolean }): ToolDefinition[] {
  if (options?.writeEnabled === false) {
    return BUILTIN_TOOLS.filter((t) => t.name !== "write_file");
  }
  return [...BUILTIN_TOOLS];
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

async function readFileTool(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const rel = String(args.path ?? "");
  if (!rel) return { ok: false, output: "read_file requires path" };
  try {
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
  try {
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

  // Soft deny list — block obvious destructive/network patterns
  if (/\brm\s+-rf\s+\/\b|curl\s+|wget\s+|nc\s+|ssh\s+/i.test(command)) {
    return { ok: false, output: "Command blocked by sandbox policy" };
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

export async function executeToolCall(
  call: ToolCall,
  ctx: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  switch (call.name) {
    case "read_file":
      return readFileTool(ctx, call.arguments);
    case "write_file":
      return writeFileTool(ctx, call.arguments);
    case "list_dir":
      return listDirTool(ctx, call.arguments);
    case "run_command":
      return runCommandTool(ctx, call.arguments);
    default:
      return { ok: false, output: `Unknown tool: ${call.name}` };
  }
}
