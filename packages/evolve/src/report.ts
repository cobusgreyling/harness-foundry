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
  type TraceEvent,
} from "@cobusgreyling/harness-foundry-core";
import { readTraceEvents } from "@cobusgreyling/harness-foundry-trace";

export type GenerateReportOptions = {
  projectRoot: string;
  sessionId: string;
  tracePath: string;
  stack?: HarnessStack;
};

type FailureClass =
  | "model_error"
  | "tool_error"
  | "budget"
  | "verification"
  | "recovery"
  | "policy";

function classifyFailures(events: TraceEvent[]): Map<FailureClass, number> {
  const counts = new Map<FailureClass, number>();
  const bump = (c: FailureClass) => counts.set(c, (counts.get(c) ?? 0) + 1);

  for (const e of events) {
    if (e.type === "error") {
      if (e.layer === "interface") bump("model_error");
      else if (e.layer === "composition") bump("tool_error");
      else bump("policy");
    }
    if (e.type === "budget.exceeded") bump("budget");
    if (e.type === "verification.fail") bump("verification");
    if (e.type === "recovery.triggered") bump("recovery");
    if (e.type === "tool.result" && e.metadata?.ok === false) bump("tool_error");
  }
  return counts;
}

function sumUsage(events: TraceEvent[]): { tokens: number; toolCalls: number } {
  let tokens = 0;
  let toolCalls = 0;
  for (const e of events) {
    if (e.type === "model.complete" && e.metadata?.usage) {
      const usage = e.metadata.usage as { total?: number };
      tokens += Number(usage.total ?? 0);
    }
    if (e.type === "tool.call") toolCalls += 1;
  }
  // Prefer session.end totals when present
  const end = events.find((e) => e.type === "session.end");
  if (end?.metadata?.tokensUsed !== undefined) {
    tokens = Number(end.metadata.tokensUsed);
  }
  if (end?.metadata?.toolCallsUsed !== undefined) {
    toolCalls = Number(end.metadata.toolCallsUsed);
  }
  return { tokens, toolCalls };
}

function primitiveHeatmap(events: TraceEvent[]): Array<{ primitive: string; count: number }> {
  const map = new Map<string, number>();
  for (const e of events) {
    if (e.type === "primitive.activate" && e.primitive) {
      map.set(e.primitive, (map.get(e.primitive) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([primitive, count]) => ({ primitive, count }))
    .sort((a, b) => b.count - a.count);
}

export async function generateEvolveReport(
  options: GenerateReportOptions,
): Promise<EvolveReport> {
  const events = await readTraceEvents(options.tracePath);
  const errors = events.filter((e) => e.type === "error");
  const recoveries = events.filter((e) => e.type === "recovery.triggered");
  const verificationFails = events.filter((e) => e.type === "verification.fail");
  const budgetExceeded = events.filter((e) => e.type === "budget.exceeded");
  const toolFails = events.filter(
    (e) => e.type === "tool.result" && e.metadata?.ok === false,
  );
  const activations = events.filter((e) => e.type === "primitive.activate").length;
  const modelCompletes = events.filter((e) => e.type === "model.complete").length;
  const toolCalls = events.filter((e) => e.type === "tool.call").length;
  const failures = classifyFailures(events);
  const usage = sumUsage(events);
  const heat = primitiveHeatmap(events);

  const findings: EvolveReport["findings"] = [];

  if (failures.size > 0) {
    const parts = [...failures.entries()].map(([k, v]) => `${k}=${v}`);
    findings.push({
      severity: "warn",
      message: `Failure taxonomy: ${parts.join(", ")}`,
      suggestion: "Prioritize the dominant class with recovery or tighter control primitives",
    });
  }

  if (errors.length > 0) {
    findings.push({
      severity: "critical",
      message: `${errors.length} error event(s) in trace`,
      suggestion: "Add recovery/revert-on-test-fail or tighten control layer",
    });
  }

  if (toolFails.length > 0) {
    findings.push({
      severity: "warn",
      message: `${toolFails.length} tool failure(s)`,
      suggestion: "Review sandbox paths, MCP server health, or tool arguments in trace",
    });
  }

  if (budgetExceeded.length > 0) {
    findings.push({
      severity: "warn",
      message: `${budgetExceeded.length} budget exceeded event(s)`,
      primitive: "control/token-budget-100k",
      suggestion: "Raise maxTokens/maxToolCalls or reduce turn depth",
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

  if (usage.tokens > 0 || usage.toolCalls > 0) {
    findings.push({
      severity: "info",
      message: `Session usage: ~${usage.tokens} tokens, ${usage.toolCalls} tool calls, ${modelCompletes} model completions`,
    });
  }

  if (heat.length > 0) {
    const top = heat
      .slice(0, 5)
      .map((h) => `${h.primitive}×${h.count}`)
      .join(", ");
    findings.push({
      severity: "info",
      message: `Primitive heatmap: ${top}`,
    });
  }

  if (activations > 20) {
    findings.push({
      severity: "info",
      message: `High primitive activation volume (${activations})`,
      suggestion: "Consider token-budget or tool-call-cap primitives",
    });
  }

  if (toolCalls > 30) {
    findings.push({
      severity: "info",
      message: `High tool-call volume (${toolCalls})`,
      primitive: "control/tool-call-cap",
      suggestion: "Add control/tool-call-cap to execution layer",
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

  const hasToolCap = stack?.layers.execution.some((p) =>
    p.primitive.startsWith("control/tool-call-cap"),
  );
  if (toolCalls > 20 && !hasToolCap) {
    findings.push({
      severity: "info",
      message: "No tool-call-cap in stack with elevated tool usage",
      primitive: "control/tool-call-cap",
      suggestion: "Add control/tool-call-cap with maxToolCalls config",
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
): Promise<{ report: EvolveReport; proposalPath: string; proposalId: string }> {
  const report = await generateEvolveReport(options);
  const additions = report.findings
    .filter((f) => f.primitive)
    .map((f) => ({ primitive: f.primitive! }));

  // Dedupe
  const seen = new Set<string>();
  const uniqueAdditions = additions.filter((a) => {
    if (seen.has(a.primitive)) return false;
    seen.add(a.primitive);
    return true;
  });

  const proposalId = randomUUID();
  const proposal = EvolveProposalSchema.parse({
    id: proposalId,
    reportId: report.id,
    sessionId: options.sessionId,
    generatedAt: new Date().toISOString(),
    mode: "L2-proposal",
    summary: `Proposed stack additions from session ${options.sessionId}`,
    additions: uniqueAdditions,
    path: "",
  });

  const outDir = evolveProposalsDir(options.projectRoot);
  await fs.mkdir(outDir, { recursive: true });
  const proposalPath = path.join(outDir, `${proposal.id}.yaml`);
  const yamlBody = [
    `# L2 proposal (human review required before apply)`,
    `id: ${proposal.id}`,
    `reportId: ${report.id}`,
    `sessionId: ${options.sessionId}`,
    `summary: ${proposal.summary}`,
    `additions:`,
    ...(uniqueAdditions.length
      ? uniqueAdditions.map((a) => `  - primitive: ${a.primitive}`)
      : ["  []"]),
  ].join("\n");
  await fs.writeFile(proposalPath, `${yamlBody}\n`, "utf8");

  return { report, proposalPath, proposalId: proposal.id };
}
