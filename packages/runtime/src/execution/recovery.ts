import fs from "node:fs/promises";
import path from "node:path";
import type { TraceRecorder } from "@cobusgreyling/harness-foundry-trace";
import type { SessionRuntime } from "./runtime-state.js";
import { revertWorktreeChanges } from "./worktree.js";

export type RecoveryContext = {
  projectRoot: string;
  sessionId: string;
  goal: string;
  recorder: TraceRecorder;
  runtime: SessionRuntime;
};

export async function applyRecoveryOnTestFail(ctx: RecoveryContext): Promise<string> {
  if (!ctx.runtime.recoveryArmed.has("recovery/revert-on-test-fail")) {
    return "recovery/revert-on-test-fail not armed";
  }

  if (ctx.runtime.worktreePath) {
    await revertWorktreeChanges(ctx.runtime.worktreePath);
    return `Reverted worktree changes at ${ctx.runtime.worktreePath}`;
  }

  return "No worktree to revert — recovery recorded only";
}

export async function applyNarrowScope(ctx: RecoveryContext): Promise<string> {
  if (!ctx.runtime.recoveryArmed.has("recovery/narrow-scope")) {
    return "recovery/narrow-scope not armed";
  }

  ctx.runtime.narrowedScope = true;
  const statePath = path.join(ctx.projectRoot, ".foundry", "state", "STATE.md");
  const note = `\n- Scope narrowed (${new Date().toISOString()}): ${ctx.goal}\n`;

  try {
    const existing = await fs.readFile(statePath, "utf8");
    await fs.writeFile(statePath, `${existing.trimEnd()}${note}`, "utf8");
  } catch {
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, `# Harness State\n${note}`, "utf8");
  }

  return "Narrowed session scope and updated STATE.md";
}

export async function triggerRecovery(
  primitive: string,
  ctx: RecoveryContext,
  reason: string,
): Promise<{ ok: boolean; detail: string }> {
  await ctx.recorder.record({
    sessionId: ctx.sessionId,
    type: "recovery.triggered",
    layer: "reliability",
    primitive,
    detail: reason,
  });

  let detail: string;
  if (primitive === "recovery/revert-on-test-fail") {
    detail = await applyRecoveryOnTestFail(ctx);
  } else if (primitive === "recovery/narrow-scope") {
    detail = await applyNarrowScope(ctx);
  } else {
    detail = `Unknown recovery primitive: ${primitive}`;
    return { ok: false, detail };
  }

  await ctx.recorder.record({
    sessionId: ctx.sessionId,
    type: "primitive.complete",
    layer: "reliability",
    primitive,
    detail,
    metadata: { ok: true, recovery: true },
  });

  return { ok: true, detail };
}