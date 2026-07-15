import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  EvolveProposalSchema,
  EvolveReportSchema,
  evolveProposalsDir,
  evolveReportsDir,
  type EvolveReport,
  type HarnessStack,
} from "@cobusgreyling/harness-foundry-core";
import { readTraceEvents } from "@cobusgreyling/harness-foundry-trace";

export type GenerateReportOptions = {
  projectRoot: string;
  sessionId: string;
  tracePath: string;
  stack?: HarnessStack;
};

export async function generateEvolveReport(
  options: GenerateReportOptions,
): Promise<EvolveReport> {
  const events = await readTraceEvents(options.tracePath);
  const errors = events.filter((e) => e.type === "error");
  const recoveries = events.filter((e) => e.type === "recovery.triggered");
  const verificationFails = events.filter((e) => e.type === "verification.fail");
  const activations = events.filter((e) => e.type === "primitive.activate").length;

  const findings: EvolveReport["findings"] = [];

  if (errors.length > 0) {
    findings.push({
      severity: "critical",
      message: `${errors.length} error event(s) in trace`,
      suggestion: "Add recovery/revert-on-test-fail primitive or tighten control layer",
    });
  }

  if (recoveries.length > 0) {
    findings.push({
      severity: "warn",
      message: `${recoveries.length} recovery event(s) triggered`,
      suggestion: "Review execution-layer sandbox and tool permissions",
    });
  }

  if (verificationFails.length > 0) {
    findings.push({
      severity: "critical",
      message: `${verificationFails.length} verification failure(s) in trace`,
      primitive: "recovery/revert-on-test-fail",
      suggestion: "Review test command in AGENTS.md or tighten implementer sandbox",
    });
  }

  if (activations > 20) {
    findings.push({
      severity: "info",
      message: `High primitive activation volume (${activations})`,
      suggestion: "Consider token-budget or tool-call-cap primitives",
    });
  }

  const stack = options.stack;
  const hasWrite = stack?.layers.composition.some((p) => p.primitive.includes("write"));
  const hasRecovery = stack?.layers.reliability.some((p) =>
    p.primitive.startsWith("recovery/"),
  );
  if (hasWrite && !hasRecovery) {
    findings.push({
      severity: "warn",
      message: "Write tools without recovery primitive in stack",
      primitive: "recovery/revert-on-test-fail",
      suggestion: "Add recovery/revert-on-test-fail to reliability layer",
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
  const outPath = path.join(outDir, `${report.id}.json`);
  await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return report;
}

export async function generateEvolveProposal(
  options: GenerateReportOptions,
): Promise<{ report: EvolveReport; proposalPath: string }> {
  const report = await generateEvolveReport(options);
  const additions = report.findings
    .filter((f) => f.primitive)
    .map((f) => ({ primitive: f.primitive! }));

  const proposal = EvolveProposalSchema.parse({
    id: randomUUID(),
    reportId: report.id,
    sessionId: options.sessionId,
    generatedAt: new Date().toISOString(),
    mode: "L2-proposal",
    summary: `Proposed stack additions from session ${options.sessionId}`,
    additions,
    path: "",
  });

  const outDir = evolveProposalsDir(options.projectRoot);
  await fs.mkdir(outDir, { recursive: true });
  const proposalPath = path.join(outDir, `${proposal.id}.yaml`);
  const yamlBody = [
    `# L2 proposal (human review required before apply)`,
    `reportId: ${report.id}`,
    `sessionId: ${options.sessionId}`,
    `summary: ${proposal.summary}`,
    `additions:`,
    ...additions.map((a) => `  - primitive: ${a.primitive}`),
  ].join("\n");
  await fs.writeFile(proposalPath, `${yamlBody}\n`, "utf8");

  return { report, proposalPath };
}