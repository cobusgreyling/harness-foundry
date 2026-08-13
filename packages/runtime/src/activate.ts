import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { getModelProvider } from "@cobusgreyling/harness-foundry-interface";
import { McpClient } from "@cobusgreyling/harness-foundry-mcp";
import type { LayerName, PrimitiveRef } from "@cobusgreyling/harness-foundry-core";
import type { TraceRecorder } from "@cobusgreyling/harness-foundry-trace";
import type { SessionRuntime } from "./execution/runtime-state.js";
import { resolveTestCommand } from "./execution/verify.js";
import {
  createSessionWorktree,
  isGitRepo,
  verifyWorktreeIsolation,
} from "./execution/worktree.js";
import { parseStringList } from "./execution/policy.js";
import { tryPrimitiveHandler } from "./plugins.js";

export type ActivateContext = {
  projectRoot: string;
  sessionId: string;
  goal: string;
  recorder: TraceRecorder;
  runtime: SessionRuntime;
};

function layerForPrimitive(id: string): LayerName {
  if (id.startsWith("model/")) return "interface";
  if (
    id.startsWith("context/") ||
    id.startsWith("tools/") ||
    id.startsWith("skills/") ||
    id.startsWith("memory/")
  ) {
    return "composition";
  }
  if (id.startsWith("control/") || id.startsWith("sandbox/") || id.startsWith("policy/")) {
    return "execution";
  }
  return "reliability";
}

function numConfig(ref: PrimitiveRef, key: string, fallback: number): number {
  const v = ref.config?.[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}

export async function activatePrimitive(
  ref: PrimitiveRef,
  ctx: ActivateContext,
): Promise<{ ok: boolean; detail: string }> {
  const layer = layerForPrimitive(ref.primitive);

  await ctx.recorder.record({
    sessionId: ctx.sessionId,
    type: "primitive.activate",
    layer,
    primitive: ref.primitive,
    detail: `Activating ${ref.primitive}`,
  });

  let detail = "OK";
  let ok = true;

  try {
    const plugin = await tryPrimitiveHandler(ref, ctx);
    if (plugin?.handled) {
      ok = plugin.ok;
      detail = plugin.detail;
    } else if (ref.primitive.startsWith("model/")) {
      const provider = getModelProvider(ref);
      if (!provider) throw new Error(`Unknown model provider: ${ref.primitive}`);
      ctx.runtime.modelPrimitive = ref.primitive;
      ctx.runtime.modelConfig = { ...ref.config };
      detail = `Model provider ${ref.primitive} registered (loop will call complete)`;
    } else if (ref.primitive === "context/state-file") {
      const statePath = path.join(ctx.projectRoot, ".foundry", "state", "STATE.md");
      try {
        const state = await fs.readFile(statePath, "utf8");
        detail = `Loaded state (${state.length} chars)`;
      } catch {
        detail = "No STATE.md yet";
      }
    } else if (ref.primitive === "context/agents-md") {
      const agentsPath = path.join(ctx.projectRoot, "AGENTS.md");
      try {
        const text = await fs.readFile(agentsPath, "utf8");
        detail = `Loaded AGENTS.md (${text.length} chars)`;
      } catch {
        detail = "No AGENTS.md — skipped";
      }
    } else if (ref.primitive === "context/skills-dir") {
      const configured = (ref.config?.dir as string | undefined) ?? "skills";
      const primary = path.isAbsolute(configured)
        ? configured
        : path.join(ctx.projectRoot, configured);
      const fallback = path.join(ctx.projectRoot, ".foundry", "skills");
      const skillsRoot = (await exists(primary)) ? primary : fallback;
      const loaded = await loadSkillsContext(skillsRoot);
      ctx.runtime.skillsContext = loaded.text || undefined;
      detail = loaded.files
        ? `Loaded ${loaded.files} skill file(s) from ${skillsRoot}`
        : `No skills found in ${primary} or ${fallback}`;
    } else if (ref.primitive === "memory/file-log") {
      const rel = (ref.config?.path as string | undefined) ?? path.join(".foundry", "state", "memory.jsonl");
      const memPath = path.isAbsolute(rel) ? rel : path.join(ctx.projectRoot, rel);
      await fs.mkdir(path.dirname(memPath), { recursive: true });
      ctx.runtime.memoryLogPath = memPath;
      detail = `Memory log ${memPath}`;
    } else if (ref.primitive === "tools/git-worktree-write") {
      ctx.runtime.writeEnabled = true;
      if (!(await isGitRepo(ctx.projectRoot))) {
        detail = "Not a git repository — skipping worktree (read-only mode)";
      } else {
        const worktree = await createSessionWorktree(ctx.projectRoot, ctx.sessionId);
        if (!worktree) throw new Error("Failed to create session worktree");
        ctx.runtime.worktreePath = worktree.path;
        ctx.runtime.worktreeBranch = worktree.branch;
        detail = `Worktree ${worktree.branch} at ${worktree.path}`;
      }
    } else if (
      ref.primitive === "tools/mcp-stdio" ||
      ref.primitive === "tools/mcp" ||
      ref.primitive.startsWith("tools/mcp-")
    ) {
      const serverCommand =
        (ref.config?.serverCommand as string | undefined) ??
        (ref.config?.command as string | undefined);
      const serverArgs = (ref.config?.serverArgs as string[] | undefined) ??
        (ref.config?.args as string[] | undefined) ??
        [];
      const client = new McpClient({
        serverCommand,
        serverArgs,
        timeoutMs: numConfig(ref, "timeoutMs", 30_000),
      });
      if (serverCommand) {
        await client.connect();
        const tools = await client.listTools();
        ctx.runtime.mcpClient = client;
        ctx.runtime.mcpToolNames = new Set(tools.map((t) => t.name));
        detail = `MCP stdio connected (${tools.length} tools): ${tools
          .map((t) => t.name)
          .slice(0, 12)
          .join(", ")}`;
      } else {
        ctx.runtime.mcpClient = client;
        const tools = await client.listTools();
        ctx.runtime.mcpToolNames = new Set(tools.map((t) => t.name));
        detail = `MCP stub mode (${tools.length} default tools) — set config.serverCommand for real stdio`;
      }
    } else if (ref.primitive === "tools/search-grep") {
      ctx.runtime.extraTools.add("search_grep");
      detail = "search_grep tool enabled";
    } else if (ref.primitive === "sandbox/readonly") {
      ctx.runtime.policy.readonly = true;
      ctx.runtime.writeEnabled = false;
      detail = "Readonly sandbox — writes and mutating commands blocked";
    } else if (ref.primitive === "policy/path-allowlist") {
      const paths = parseStringList(ref.config?.paths ?? ref.config?.allow);
      ctx.runtime.policy.pathAllowlist = paths;
      detail = paths.length
        ? `Path allowlist: ${paths.join(", ")}`
        : "Path allowlist empty (all workspace paths allowed)";
    } else if (ref.primitive === "policy/command-allowlist") {
      const commands = parseStringList(ref.config?.commands ?? ref.config?.allow);
      ctx.runtime.policy.commandAllowlist = commands;
      detail = commands.length
        ? `Command allowlist: ${commands.join(", ")}`
        : "Command allowlist empty (default deny-list only)";
    } else if (ref.primitive === "policy/secret-scrub") {
      ctx.runtime.policy.secretScrub = true;
      detail = "Secret scrub enabled on tool output";
    } else if (
      ref.primitive === "control/network-deny" ||
      ref.primitive === "policy/network-deny"
    ) {
      ctx.runtime.policy.networkDenied = true;
      detail = "Network commands denied";
    } else if (ref.primitive === "sandbox/worktree-isolated") {
      if (ctx.runtime.worktreePath) {
        const isolation = await verifyWorktreeIsolation(ctx.projectRoot, ctx.runtime.worktreePath);
        ok = isolation.ok;
        detail = isolation.detail;
      } else if (await isGitRepo(ctx.projectRoot)) {
        const worktree = await createSessionWorktree(ctx.projectRoot, ctx.sessionId);
        if (!worktree) throw new Error("Failed to create isolated worktree");
        ctx.runtime.worktreePath = worktree.path;
        ctx.runtime.worktreeBranch = worktree.branch;
        const isolation = await verifyWorktreeIsolation(ctx.projectRoot, worktree.path);
        ok = isolation.ok;
        detail = isolation.detail;
      } else {
        detail = "No git repo — sandbox runs in project root (non-isolated)";
      }
    } else if (ref.primitive === "recovery/revert-on-test-fail") {
      ctx.runtime.recoveryArmed.add(ref.primitive);
      ctx.runtime.testCommand ??= (await resolveTestCommand(ctx.projectRoot)) ?? "npm test";
      detail = `Recovery armed (revert on test failure, command: ${ctx.runtime.testCommand})`;
    } else if (ref.primitive === "recovery/narrow-scope") {
      ctx.runtime.recoveryArmed.add(ref.primitive);
      detail = "Recovery armed (narrow scope on failure)";
    } else if (ref.primitive === "recovery/retry-once") {
      ctx.runtime.recoveryArmed.add(ref.primitive);
      detail = "Recovery armed (retry verification once)";
    } else if (ref.primitive === "observability/tool-timeline") {
      ctx.runtime.recordToolTimeline = true;
      detail = "Tool timeline recording enabled";
    } else if (
      ref.primitive === "control/token-budget-50k" ||
      ref.primitive === "control/token-budget-100k" ||
      ref.primitive.startsWith("control/token-budget")
    ) {
      const tokenFallback = ref.primitive.includes("50k") ? 50_000 : 100_000;
      ctx.runtime.maxTokens = numConfig(ref, "maxTokens", tokenFallback);
      ctx.runtime.maxToolCalls = numConfig(ref, "maxToolCalls", ctx.runtime.maxToolCalls);
      detail = `Token budget ${ctx.runtime.maxTokens} / tool-call cap ${ctx.runtime.maxToolCalls}`;
    } else if (
      ref.primitive === "control/tool-call-cap" ||
      ref.primitive.startsWith("control/tool-call-cap")
    ) {
      ctx.runtime.maxToolCalls = numConfig(ref, "maxToolCalls", 20);
      detail = `Tool-call cap set to ${ctx.runtime.maxToolCalls}`;
    } else if (ref.primitive.startsWith("tools/")) {
      const mcp = new McpClient();
      const tools = await mcp.listTools();
      detail = `Tools available: ${tools.map((t) => t.name).join(", ")}`;
    } else {
      detail = `Primitive ${ref.primitive} ready`;
    }
  } catch (error) {
    ok = false;
    detail = error instanceof Error ? error.message : String(error);
    if (ref.primitive.startsWith("recovery/")) {
      await ctx.recorder.record({
        sessionId: ctx.sessionId,
        type: "recovery.triggered",
        layer: "reliability",
        primitive: ref.primitive,
        detail,
      });
    } else {
      await ctx.recorder.record({
        sessionId: ctx.sessionId,
        type: "error",
        layer,
        primitive: ref.primitive,
        detail,
      });
    }
  }

  await ctx.recorder.record({
    sessionId: ctx.sessionId,
    type: "primitive.complete",
    layer,
    primitive: ref.primitive,
    detail: ok ? detail : `Failed: ${detail}`,
    metadata: { ok },
  });

  return { ok, detail };
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function loadSkillsContext(root: string): Promise<{ text: string; files: number }> {
  const chunks: string[] = [];
  let files = 0;
  let total = 0;

  async function consider(filePath: string, label: string): Promise<void> {
    if (files >= 12 || total >= 8000) return;
    try {
      const text = await fs.readFile(filePath, "utf8");
      const slice = text.slice(0, 2000);
      chunks.push(`## ${label}\n${slice}`);
      files += 1;
      total += slice.length;
    } catch {
      // skip missing
    }
  }

  let entries: Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return { text: "", files: 0 };
  }

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      await consider(path.join(root, entry.name), entry.name);
    } else if (entry.isDirectory()) {
      await consider(path.join(root, entry.name, "SKILL.md"), `${entry.name}/SKILL.md`);
    }
  }

  return { text: chunks.join("\n\n"), files };
}
