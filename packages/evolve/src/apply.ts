import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import YAML from "yaml";
import {
  EvolveProposalSchema,
  type EvolveProposal,
  type HarnessStack,
  type LayerName,
  type PrimitiveRef,
  evolveProposalsDir,
  evolveAppliedDir,
  stackPath,
} from "@cobusgreyling/harness-foundry-core";
import { loadStackFromFile, saveStackToFile } from "@cobusgreyling/harness-foundry-compose";

export type ApplyProposalOptions = {
  projectRoot: string;
  /** Proposal UUID or path to proposal yaml. */
  proposal: string;
  /** Required human gate — refuse without explicit yes. */
  yes: boolean;
};

export type ApplyProposalResult = {
  proposalId: string;
  stackPath: string;
  auditPath: string;
  added: PrimitiveRef[];
  skipped: PrimitiveRef[];
  stack: HarnessStack;
};

function layerForPrimitive(id: string): LayerName {
  if (id.startsWith("model/")) return "interface";
  if (id.startsWith("context/") || id.startsWith("tools/") || id.startsWith("skills/"))
    return "composition";
  if (id.startsWith("control/") || id.startsWith("sandbox/")) return "execution";
  return "reliability";
}

function stackHasPrimitive(stack: HarnessStack, primitive: string): boolean {
  const layers = Object.values(stack.layers) as PrimitiveRef[][];
  return layers.some((list) => list.some((p) => p.primitive === primitive));
}

async function resolveProposalPath(projectRoot: string, proposal: string): Promise<string> {
  if (proposal.endsWith(".yaml") || proposal.endsWith(".yml") || proposal.includes(path.sep)) {
    return path.isAbsolute(proposal) ? proposal : path.join(projectRoot, proposal);
  }
  return path.join(evolveProposalsDir(projectRoot), `${proposal}.yaml`);
}

async function loadProposal(filePath: string): Promise<EvolveProposal> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = YAML.parse(raw) as Record<string, unknown>;

  // CLI-written proposals may omit full schema fields — normalize
  const normalized = {
    id: String(parsed.id ?? path.basename(filePath, path.extname(filePath))),
    reportId: String(parsed.reportId ?? randomUUID()),
    sessionId: String(parsed.sessionId ?? randomUUID()),
    generatedAt: String(parsed.generatedAt ?? new Date().toISOString()),
    mode: "L2-proposal" as const,
    summary: String(parsed.summary ?? "L2 proposal"),
    additions: Array.isArray(parsed.additions)
      ? (parsed.additions as Array<{ primitive?: string }>).map((a) => ({
          primitive: String(a.primitive ?? a),
        }))
      : [],
    path: filePath,
  };

  return EvolveProposalSchema.parse(normalized);
}

/**
 * Apply an L2 evolve proposal to stack.yaml.
 * Requires `yes: true` — human gate (never auto-apply).
 */
export async function applyEvolveProposal(
  options: ApplyProposalOptions,
): Promise<ApplyProposalResult> {
  if (!options.yes) {
    throw new Error(
      "Human gate: pass --yes to apply an L2 proposal to stack.yaml (review the proposal first)",
    );
  }

  const proposalFile = await resolveProposalPath(options.projectRoot, options.proposal);
  const proposal = await loadProposal(proposalFile);
  const stackFile = stackPath(options.projectRoot);
  const stack = await loadStackFromFile(stackFile);

  const added: PrimitiveRef[] = [];
  const skipped: PrimitiveRef[] = [];

  for (const addition of proposal.additions) {
    if (stackHasPrimitive(stack, addition.primitive)) {
      skipped.push(addition);
      continue;
    }
    const layer = layerForPrimitive(addition.primitive);
    stack.layers[layer].push({ ...addition });
    added.push(addition);
  }

  await saveStackToFile(stack, stackFile);

  const auditDir = evolveAppliedDir(options.projectRoot);
  await fs.mkdir(auditDir, { recursive: true });
  const appliedAt = new Date().toISOString();
  const audit = {
    id: randomUUID(),
    proposalId: proposal.id,
    reportId: proposal.reportId,
    sessionId: proposal.sessionId,
    appliedAt,
    stackPath: stackFile,
    proposalPath: proposalFile,
    added,
    skipped,
    summary: proposal.summary,
  };
  const auditPath = path.join(auditDir, `${audit.id}.json`);
  await fs.writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");

  return {
    proposalId: proposal.id,
    stackPath: stackFile,
    auditPath,
    added,
    skipped,
    stack,
  };
}
