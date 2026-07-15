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

export type RunSessionOptions = {
  projectRoot: string;
  goal?: string;
  turns?: number;
  dryRun?: boolean;
};

export type RunSessionResult = {
  manifest: SessionManifest;
  stack: HarnessStack;
};

export async function runSession(options: RunSessionOptions): Promise<RunSessionResult> {
  const { projectRoot, goal = "Explore and verify project state", turns = 1, dryRun = false } =
    options;

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
    metadata: { dryRun, stack: stack.name },
  });

  await recorder.record({
    sessionId,
    type: "stack.resolved",
    detail: `${resolved.primitives.length} primitives resolved`,
    metadata: { primitives: resolved.primitives.map((p) => p.primitive) },
  });

  const activateCtx = { projectRoot, sessionId, goal, recorder };

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
    metadata: { turnCount: manifest.turnCount, status: manifest.status },
  });

  return { manifest, stack };
}