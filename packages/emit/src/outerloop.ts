import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import {
  EvidenceHookSchema,
  hooksDir,
  type HarnessStack,
} from "@cobusgreyling/harness-foundry-core";
import type { TraceRecorder } from "@cobusgreyling/harness-foundry-trace";

export type EmitOptions = {
  projectRoot: string;
  sessionId: string;
  stack: HarnessStack;
  goal: string;
  recorder: TraceRecorder;
};

export async function loadEvidenceHook(projectRoot: string) {
  const hookPath = path.join(hooksDir(projectRoot), "outerloop.yaml");
  try {
    const raw = await fs.readFile(hookPath, "utf8");
    return EvidenceHookSchema.parse(YAML.parse(raw));
  } catch {
    return EvidenceHookSchema.parse({ enabled: false });
  }
}

export async function maybeEmitEvidence(options: EmitOptions): Promise<void> {
  const hook = await loadEvidenceHook(options.projectRoot);
  if (!hook.enabled) return;

  const payload = {
    source: "custom-harness",
    harness: options.stack.name,
    sessionId: options.sessionId,
    goal: options.goal,
    adapter: hook.adapter,
    emittedAt: new Date().toISOString(),
    note: "Stub evidence payload — wire to @cobusgreyling/outerloop-evidence in v0.2",
  };

  const outDir = path.join(options.projectRoot, ".foundry", "sessions", options.sessionId);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "evidence-stub.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );

  await options.recorder.record({
    sessionId: options.sessionId,
    type: "evidence.emitted",
    layer: "reliability",
    primitive: "emit/outerloop-evidence",
    detail: "Evidence stub written",
    metadata: { adapter: hook.adapter },
  });
}