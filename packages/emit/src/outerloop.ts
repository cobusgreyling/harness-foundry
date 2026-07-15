import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { EvidencePackageBuilder } from "@cobusgreyling/outerloop-core";
import {
  EvidenceHookSchema,
  hooksDir,
  type HarnessStack,
} from "@cobusgreyling/harness-foundry-core";
import { readTraceEvents, type TraceRecorder } from "@cobusgreyling/harness-foundry-trace";

export type EmitOptions = {
  projectRoot: string;
  sessionId: string;
  stack: HarnessStack;
  goal: string;
  recorder: TraceRecorder;
  tracePath: string;
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

export async function maybeEmitEvidence(options: EmitOptions): Promise<string | null> {
  const hook = await loadEvidenceHook(options.projectRoot);
  if (!hook.enabled) return null;

  const events = await readTraceEvents(options.tracePath);
  const errors = events.filter((e) => e.type === "error").length;
  const activations = events.filter((e) => e.type === "primitive.activate").length;

  const evidence = new EvidencePackageBuilder({
    runId: options.sessionId,
    loopId: options.stack.name,
    source: "custom-harness",
    goal: options.goal,
    steps: events
      .filter((e) => e.type === "primitive.complete")
      .map((e) => `${e.primitive}: ${e.detail ?? "done"}`),
    harnessBoundary: {
      name: options.stack.name,
      version: options.stack.version,
      path: ".foundry/stack.yaml",
    },
  })
    .withObservability({
      logs: [`foundry session ${options.sessionId}`, `primitive activations: ${activations}`],
      traces: events.slice(0, 20).map((e) => ({
        id: e.id,
        label: e.type,
        timestamp: e.timestamp,
        detail: e.primitive ?? e.detail,
      })),
    })
    .withRiskAssessment({
      score: Math.min(10, errors * 3),
      factors: errors > 0 ? [`${errors} error event(s) in trace`] : [],
      mitigations: errors > 0 ? ["Review evolve report and tighten recovery primitives"] : [],
    })
    .withSummaries({
      executive: `Harness session ${options.sessionId} completed for stack ${options.stack.name}.`,
      technical: `${activations} primitives activated; ${errors} errors.`,
      decisionRelevant: errors > 0 ? "Errors detected — human review recommended." : "No errors in trace.",
    })
    .build();

  const sessionDir = path.join(
    options.projectRoot,
    ".foundry",
    "sessions",
    options.sessionId,
  );
  await fs.mkdir(sessionDir, { recursive: true });
  const evidencePath = path.join(sessionDir, "evidence.json");
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  const outerloopDir = path.join(options.projectRoot, ".outerloop", "evidence");
  try {
    await fs.mkdir(outerloopDir, { recursive: true });
    await fs.writeFile(
      path.join(outerloopDir, `${evidence.id}.json`),
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    );
  } catch {
    // outerloop not initialized — session evidence is sufficient
  }

  await options.recorder.record({
    sessionId: options.sessionId,
    type: "evidence.emitted",
    layer: "reliability",
    primitive: "emit/outerloop-evidence",
    detail: `EvidencePackage ${evidence.id} written`,
    metadata: { adapter: hook.adapter, evidenceId: evidence.id },
  });

  return evidencePath;
}