import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  loadMergedCatalog,
  loadStackFromFile,
  resolveStack,
  validateStack,
  writeStackLock,
} from "@cobusgreyling/harness-foundry-compose";
import {
  SessionManifestSchema,
  sessionDir,
  sessionManifestPath,
  sessionTracePath,
  stackPath,
  type HarnessStack,
  type SessionManifest,
} from "@cobusgreyling/harness-foundry-core";
import { maybeEmitEvidence } from "@cobusgreyling/harness-foundry-emit";
import { TraceRecorder } from "@cobusgreyling/harness-foundry-trace";
import { activatePrimitive } from "./activate.js";
import { triggerRecovery, type RecoveryContext } from "./execution/recovery.js";
import { createSessionRuntime } from "./execution/runtime-state.js";
import { resolveTestCommand, runVerification } from "./execution/verify.js";
import { removeSessionWorktree } from "./execution/worktree.js";

export type RunSessionOptions = {
  projectRoot: string;
  goal?: string;
  turns?: number;
  dryRun?: boolean;
  host?: "cursor" | "claude-code" | "standalone" | "auto";
};

export type RunSessionResult = {
  manifest: SessionManifest;
  stack: HarnessStack;
};

async function verifySession(
  ctx: RecoveryContext,
  stack: HarnessStack,
): Promise<{ passed: boolean; detail: string }> {
  const resolved = resolveStack(stack);
  const hasWriteTools = resolved.primitives.some((p) => p.primitive.includes("write"));
  if (!hasWriteTools) {
    return { passed: true, detail: "No write tools — verification skipped" };
  }

  const cwd = ctx.runtime.worktreePath ?? ctx.projectRoot;
  const command =
    ctx.runtime.testCommand ?? (await resolveTestCommand(ctx.projectRoot)) ?? "npm test";

  await ctx.recorder.record({
    sessionId: ctx.sessionId,
    type: "verification.run",
    detail: command,
    metadata: { cwd },
  });

  const result = await runVerification(cwd, command);
  ctx.runtime.verificationPassed = result.ok;

  await ctx.recorder.record({
    sessionId: ctx.sessionId,
    type: result.ok ? "verification.pass" : "verification.fail",
    detail: result.output.slice(0, 500),
    metadata: { command: result.command },
  });

  return { passed: result.ok, detail: result.output.slice(0, 500) };
}

export async function runSession(options: RunSessionOptions): Promise<RunSessionResult> {
  const {
    projectRoot,
    goal = "Explore and verify project state",
    turns = 1,
    dryRun = false,
    host = "standalone",
  } = options;

  const stack = await loadStackFromFile(stackPath(projectRoot));
  const catalog = await loadMergedCatalog(projectRoot);
  const validation = validateStack(stack, catalog);
  if (!validation.valid) {
    throw new Error(`Invalid stack: ${validation.errors.join("; ")}`);
  }

  await writeStackLock(projectRoot, stack, catalog);
  const resolved = resolveStack(stack);
  const sessionId = randomUUID();
  const traceFile = sessionTracePath(projectRoot, sessionId);
  const manifestFile = sessionManifestPath(projectRoot, sessionId);

  await fs.mkdir(sessionDir(projectRoot, sessionId), { recursive: true });

  const recorder = new TraceRecorder(traceFile);
  const startedAt = new Date().toISOString();
  const runtime = createSessionRuntime(host === "auto" ? "standalone" : host);

  let manifest: SessionManifest = SessionManifestSchema.parse({
    id: sessionId,
    stackName: stack.name,
    stackVersion: stack.version,
    startedAt,
    status: "running",
    turnCount: 0,
    tracePath: traceFile,
  });
  await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  await recorder.record({
    sessionId,
    type: "session.start",
    detail: goal,
    metadata: { dryRun, stack: stack.name, host: runtime.host },
  });

  await recorder.record({
    sessionId,
    type: "stack.resolved",
    detail: `${resolved.primitives.length} primitives resolved`,
    metadata: { primitives: resolved.primitives.map((p) => p.primitive) },
  });

  const activateCtx = { projectRoot, sessionId, goal, recorder, runtime };
  const recoveryCtx: RecoveryContext = { ...activateCtx, runtime };

  for (let turn = 1; turn <= turns; turn += 1) {
    await recorder.record({
      sessionId,
      type: "turn.start",
      detail: `Turn ${turn}`,
      metadata: { turn },
    });

    if (!dryRun) {
      for (const ref of resolved.primitives) {
        const result = await activatePrimitive(ref, activateCtx);
        if (!result.ok && ref.primitive.startsWith("recovery/")) {
          manifest = { ...manifest, status: "recovered" };
        }
      }
    }

    await recorder.record({
      sessionId,
      type: "turn.end",
      detail: `Turn ${turn} complete`,
      metadata: { turn },
    });

    manifest = { ...manifest, turnCount: turn };
    await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  if (!dryRun && runtime.recoveryArmed.has("recovery/revert-on-test-fail")) {
    const verification = await verifySession(recoveryCtx, stack);
    if (!verification.passed) {
      const recovery = await triggerRecovery(
        "recovery/revert-on-test-fail",
        recoveryCtx,
        `Verification failed: ${verification.detail}`,
      );
      if (recovery.ok) {
        manifest = { ...manifest, status: "recovered" };
        await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      }
    }
  } else if (!dryRun && runtime.recoveryArmed.has("recovery/narrow-scope")) {
    const verification = await verifySession(recoveryCtx, stack);
    if (!verification.passed) {
      const recovery = await triggerRecovery(
        "recovery/narrow-scope",
        recoveryCtx,
        `Verification failed: ${verification.detail}`,
      );
      if (recovery.ok) {
        manifest = { ...manifest, status: "recovered" };
        await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      }
    }
  }

  await maybeEmitEvidence({
    projectRoot,
    sessionId,
    stack,
    goal,
    recorder,
    tracePath: traceFile,
  });

  const endedAt = new Date().toISOString();
  manifest = {
    ...manifest,
    endedAt,
    status: manifest.status === "recovered" ? "recovered" : "completed",
  };
  await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  await recorder.record({
    sessionId,
    type: "session.end",
    detail: "Session complete",
    metadata: {
      turnCount: manifest.turnCount,
      status: manifest.status,
      worktreePath: runtime.worktreePath,
      verificationPassed: runtime.verificationPassed,
    },
  });

  if (runtime.worktreePath && manifest.status === "completed" && runtime.verificationPassed) {
    await removeSessionWorktree(projectRoot, sessionId, runtime.worktreePath);
  }

  return { manifest, stack };
}