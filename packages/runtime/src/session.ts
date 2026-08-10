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
  type PrimitiveRef,
  type SessionManifest,
} from "@cobusgreyling/harness-foundry-core";
import { maybeEmitEvidence } from "@cobusgreyling/harness-foundry-emit";
import { TraceRecorder } from "@cobusgreyling/harness-foundry-trace";
import { activatePrimitive } from "./activate.js";
import { triggerRecovery, type RecoveryContext } from "./execution/recovery.js";
import { createSessionRuntime } from "./execution/runtime-state.js";
import { runTurnLoop } from "./execution/turn-loop.js";
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

function pickModelRef(primitives: PrimitiveRef[]): PrimitiveRef {
  const model = primitives.find((p) => p.primitive.startsWith("model/"));
  return model ?? { primitive: "model/mock" };
}

/** Setup order: context/tools → sandbox → control → recovery → observability (model last via loop). */
function setupOrder(primitives: PrimitiveRef[]): PrimitiveRef[] {
  const rank = (id: string): number => {
    if (id.startsWith("model/")) return 100;
    if (id.startsWith("context/")) return 10;
    if (id.startsWith("tools/")) return 20;
    if (id.startsWith("sandbox/")) return 30;
    if (id.startsWith("control/")) return 40;
    if (id.startsWith("recovery/")) return 50;
    if (id.startsWith("observability/") || id.startsWith("emit/")) return 60;
    return 70;
  };
  return [...primitives].sort((a, b) => rank(a.primitive) - rank(b.primitive));
}

export async function runSession(options: RunSessionOptions): Promise<RunSessionResult> {
  const {
    projectRoot,
    goal = "Explore and verify project state",
    turns = 8,
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
  const modelRef = pickModelRef(resolved.primitives);

  if (!dryRun) {
    // 1) Setup phase — activate infrastructure primitives (including model registration)
    for (const ref of setupOrder(resolved.primitives)) {
      await activatePrimitive(ref, activateCtx);
    }

    // 2) Agent turn loop — model ↔ tools with budget enforcement
    const loopResult = await runTurnLoop({
      projectRoot,
      sessionId,
      goal,
      recorder,
      runtime,
      modelRef: {
        primitive: runtime.modelPrimitive ?? modelRef.primitive,
        config: runtime.modelConfig ?? modelRef.config,
        version: modelRef.version,
      },
      maxTurns: Math.max(1, turns),
    });

    manifest = {
      ...manifest,
      turnCount: loopResult.turnsCompleted,
      status: loopResult.stoppedReason === "error" ? "failed" : "running",
    };
    await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  } else {
    for (let turn = 1; turn <= turns; turn += 1) {
      await recorder.record({
        sessionId,
        type: "turn.start",
        detail: `Turn ${turn} (dry-run)`,
        metadata: { turn, dryRun: true },
      });
      await recorder.record({
        sessionId,
        type: "turn.end",
        detail: `Turn ${turn} complete (dry-run)`,
        metadata: { turn, dryRun: true },
      });
      manifest = { ...manifest, turnCount: turn };
      await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    }
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
  const finalStatus =
    manifest.status === "recovered"
      ? "recovered"
      : manifest.status === "failed"
        ? "failed"
        : "completed";
  manifest = {
    ...manifest,
    endedAt,
    status: finalStatus,
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
      tokensUsed: runtime.tokensUsed,
      toolCallsUsed: runtime.toolCallsUsed,
    },
  });

  if (runtime.worktreePath && manifest.status === "completed" && runtime.verificationPassed) {
    await removeSessionWorktree(projectRoot, sessionId, runtime.worktreePath);
  }

  if (runtime.mcpClient) {
    try {
      await runtime.mcpClient.close();
    } catch {
      // ignore close errors
    }
  }

  return { manifest, stack };
}
