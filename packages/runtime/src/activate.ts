import fs from "node:fs/promises";
import path from "node:path";
import type { LayerName, PrimitiveRef } from "@cobusgreyling/harness-foundry-core";
import type { TraceRecorder } from "@cobusgreyling/harness-foundry-trace";
import { parseBudgetConfig } from "./execution/budget.js";
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

/**
 * Activate a non-model primitive during session setup.
 * Model primitives are handled by the turn loop, not here.
 */
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
      ctx.runtime.modelPrimitive = ref.primitive;
      ctx.runtime.modelConfig = ref.config;
      detail = `Model provider registered: ${ref.primitive}`;
    } else if (ref.primitive === "context/state-file") {
      const statePath = path.join(ctx.projectRoot, ".foundry", "state", "STATE.md");
      try {
        const state = await fs.readFile(statePath, "utf8");
        detail = `Loaded state (${state.length} chars)`;
      } catch {
        detail = "No STATE.md yet";
      }
    } else if (ref.primitive === "tools/git-worktree-write") {
      ctx.runtime.writeEnabled = true;
      if (!(await isGitRepo(ctx.projectRoot))) {
        detail = "Write tools enabled (no git repo — worktree skipped)";
      } else {
        const worktree = await createSessionWorktree(ctx.projectRoot, ctx.sessionId);
        if (!worktree) throw new Error("Failed to create session worktree");
        ctx.runtime.worktreePath = worktree.path;
        ctx.runtime.worktreeBranch = worktree.branch;
        detail = `Write tools + worktree ${worktree.branch} at ${worktree.path}`;
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
      ctx.runtime.writeEnabled = true;
      detail = "Write tools enabled for session";
    } else if (ref.primitive === "recovery/revert-on-test-fail") {
      ctx.runtime.recoveryArmed.add(ref.primitive);
      ctx.runtime.testCommand ??= (await resolveTestCommand(ctx.projectRoot)) ?? "npm test";
      detail = `Recovery armed (revert on test failure, command: ${ctx.runtime.testCommand})`;
    } else if (ref.primitive === "recovery/narrow-scope") {
      ctx.runtime.recoveryArmed.add(ref.primitive);
      detail = "Recovery armed (narrow scope on failure)";
    } else if (ref.primitive.startsWith("control/token-budget")) {
      const budget = parseBudgetConfig(ref.config);
      ctx.runtime.maxTokens = budget.maxTokens;
      ctx.runtime.maxToolCalls = budget.maxToolCalls;
      detail = `Token budget ${budget.maxTokens}, tool-call budget ${budget.maxToolCalls}`;
    } else if (ref.primitive === "observability/span-per-turn") {
      detail = "Per-turn span tracing active";
    } else if (ref.primitive === "emit/outerloop-evidence") {
      detail = "outerloop evidence emission armed";
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
