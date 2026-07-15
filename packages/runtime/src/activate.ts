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

export type ActivateContext = {
  projectRoot: string;
  sessionId: string;
  goal: string;
  recorder: TraceRecorder;
  runtime: SessionRuntime;
};

function layerForPrimitive(id: string): LayerName {
  if (id.startsWith("model/")) return "interface";
  if (id.startsWith("context/") || id.startsWith("tools/") || id.startsWith("skills/"))
    return "composition";
  if (id.startsWith("control/") || id.startsWith("sandbox/")) return "execution";
  return "reliability";
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
    if (ref.primitive.startsWith("model/")) {
      const provider = getModelProvider(ref);
      if (!provider) throw new Error(`Unknown model provider: ${ref.primitive}`);
      const cwd = ctx.runtime.worktreePath ?? ctx.projectRoot;
      const result = await provider.complete({
        goal: ctx.goal,
        messages: [{ role: "user", content: ctx.goal }],
        config: { ...ref.config, cwd },
      });
      detail = result.simulated
        ? `${result.content}`
        : `${result.content.slice(0, 200)}…`;
    } else if (ref.primitive === "context/state-file") {
      const statePath = path.join(ctx.projectRoot, ".foundry", "state", "STATE.md");
      try {
        const state = await fs.readFile(statePath, "utf8");
        detail = `Loaded state (${state.length} chars)`;
      } catch {
        detail = "No STATE.md yet";
      }
    } else if (ref.primitive === "tools/git-worktree-write") {
      if (!(await isGitRepo(ctx.projectRoot))) {
        detail = "Not a git repository — skipping worktree (read-only mode)";
      } else {
        const worktree = await createSessionWorktree(ctx.projectRoot, ctx.sessionId);
        if (!worktree) throw new Error("Failed to create session worktree");
        ctx.runtime.worktreePath = worktree.path;
        ctx.runtime.worktreeBranch = worktree.branch;
        detail = `Worktree ${worktree.branch} at ${worktree.path}`;
      }
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
    } else if (ref.primitive.startsWith("tools/")) {
      const mcp = new McpClient();
      const tools = await mcp.listTools();
      detail = `Tools available: ${tools.map((t) => t.name).join(", ")}`;
    } else if (ref.primitive === "recovery/revert-on-test-fail") {
      ctx.runtime.recoveryArmed.add(ref.primitive);
      ctx.runtime.testCommand ??= (await resolveTestCommand(ctx.projectRoot)) ?? "npm test";
      detail = `Recovery armed (revert on test failure, command: ${ctx.runtime.testCommand})`;
    } else if (ref.primitive === "recovery/narrow-scope") {
      ctx.runtime.recoveryArmed.add(ref.primitive);
      detail = "Recovery armed (narrow scope on failure)";
    } else if (ref.primitive === "control/token-budget-100k") {
      detail = "Token budget 100k active";
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