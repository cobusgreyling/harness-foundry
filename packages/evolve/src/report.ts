import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  EvolveReportSchema,
  evolveReportsDir,
  type EvolveReport,
} from "@cobusgreyling/harness-foundry-core";
import { readTraceEvents } from "@cobusgreyling/harness-foundry-trace";

export type GenerateReportOptions = {
  projectRoot: string;
  sessionId: string;
  tracePath: string;
};

export async function generateEvolveReport(
  options: GenerateReportOptions,
): Promise<EvolveReport> {
  const events = await readTraceEvents(options.tracePath);
  const errors = events.filter((e) => e.type === "error");
  const recoveries = events.filter((e) => e.type === "recovery.triggered");

  const findings: EvolveReport["findings"] = [];

  if (errors.length > 0) {
    findings.push({
      severity: "critical",
      message: `${errors.length} error event(s) in trace`,
      suggestion: "Add recovery/revert-on-fail primitive or tighten control layer",
    });
  }

  if (recoveries.length > 0) {
    findings.push({
      severity: "warn",
      message: `${recoveries.length} recovery event(s) triggered`,
      suggestion: "Review execution-layer sandbox and tool permissions",
    });
  }

  const toolCalls = events.filter((e) => e.type === "tool.call").length;
  if (toolCalls > 20) {
    findings.push({
      severity: "info",
      message: `High tool-call volume (${toolCalls})`,
      suggestion: "Consider token-budget or tool-call-cap primitives",
    });
  }

  if (findings.length === 0) {
    findings.push({
      severity: "info",
      message: "No evolution signals detected in trace",
    });
  }

  const report = EvolveReportSchema.parse({
    id: randomUUID(),
    sessionId: options.sessionId,
    generatedAt: new Date().toISOString(),
    mode: "L1-report-only",
    findings,
  });

  const outDir = evolveReportsDir(options.projectRoot);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = `${outDir}/${report.id}.json`;
  await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return report;
}