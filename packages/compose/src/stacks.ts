import type { HarnessStack } from "@cobusgreyling/harness-foundry-core";

export type StackPreset = "minimal" | "implementer" | "reviewer" | "triage";

/** loop-engineering pattern / alias → stack preset (LE → Foundry funnel). */
const PRESET_ALIASES: Record<string, StackPreset> = {
  minimal: "minimal",
  implementer: "implementer",
  reviewer: "reviewer",
  triage: "triage",
  "daily-triage": "triage",
  "issue-triage": "triage",
  "changelog-drafter": "minimal",
  "pr-babysitter": "implementer",
  "ci-sweeper": "implementer",
  "dependency-sweeper": "implementer",
  "post-merge-cleanup": "implementer",
  "code-review": "reviewer",
};

/**
 * Resolve `foundry init --from` values, including loop-engineering pattern names
 * and `loop-engineering:<pattern>` aliases.
 */
export function resolveStackPreset(from: string): StackPreset {
  const raw = from.trim().toLowerCase();
  const key = raw.startsWith("loop-engineering:")
    ? raw.slice("loop-engineering:".length).trim()
    : raw;
  return PRESET_ALIASES[key] ?? "minimal";
}

export function minimalStack(name: string): HarnessStack {
  return {
    name,
    version: "1.0.0",
    description: "Smallest reliable harness stack",
    layers: {
      interface: [{ primitive: "model/mock" }],
      composition: [{ primitive: "context/state-file" }],
      execution: [
        { primitive: "control/token-budget-100k" },
        { primitive: "control/tool-call-cap", config: { maxToolCalls: 20 } },
        { primitive: "sandbox/worktree-isolated" },
      ],
      reliability: [
        { primitive: "observability/span-per-turn" },
        { primitive: "emit/outerloop-evidence" },
      ],
    },
  };
}

export function implementerStack(name: string): HarnessStack {
  return {
    name,
    version: "1.0.0",
    description: "Read-write implementer loop with recovery and evidence",
    layers: {
      interface: [{ primitive: "model/anthropic", config: { model: "claude-sonnet-4-20250514" } }],
      composition: [
        { primitive: "context/state-file" },
        { primitive: "context/agents-md" },
        { primitive: "tools/git-worktree-write" },
      ],
      execution: [
        { primitive: "sandbox/worktree-isolated" },
        { primitive: "control/token-budget-100k" },
        { primitive: "control/tool-call-cap", config: { maxToolCalls: 40 } },
      ],
      reliability: [
        { primitive: "observability/span-per-turn" },
        { primitive: "recovery/revert-on-test-fail" },
        { primitive: "emit/outerloop-evidence" },
      ],
    },
  };
}

export function reviewerStack(name: string): HarnessStack {
  return {
    name,
    version: "1.0.0",
    description: "Read-only review loop (no write tools)",
    layers: {
      interface: [{ primitive: "model/mock" }],
      composition: [
        { primitive: "context/state-file" },
        { primitive: "context/agents-md" },
      ],
      execution: [
        { primitive: "control/token-budget-100k" },
        { primitive: "control/tool-call-cap", config: { maxToolCalls: 15 } },
      ],
      reliability: [
        { primitive: "observability/span-per-turn" },
        { primitive: "emit/outerloop-evidence" },
      ],
    },
  };
}

export function triageStack(name: string): HarnessStack {
  return {
    name,
    version: "1.0.0",
    description: "Lightweight triage / classification loop",
    layers: {
      interface: [{ primitive: "model/openai-compatible", config: { model: "gpt-4o-mini" } }],
      composition: [
        { primitive: "context/state-file" },
        { primitive: "context/agents-md" },
      ],
      execution: [
        { primitive: "control/token-budget-100k", config: { maxTokens: 50_000, maxToolCalls: 10 } },
        { primitive: "control/tool-call-cap", config: { maxToolCalls: 10 } },
      ],
      reliability: [
        { primitive: "observability/span-per-turn" },
        { primitive: "emit/outerloop-evidence" },
      ],
    },
  };
}

export function stackFromPreset(preset: StackPreset, name: string): HarnessStack {
  if (preset === "implementer") return implementerStack(name);
  if (preset === "reviewer") return reviewerStack(name);
  if (preset === "triage") return triageStack(name);
  return minimalStack(name);
}
