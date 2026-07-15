import type { HarnessStack } from "@cobusgreyling/harness-foundry-core";

export type StackPreset = "minimal" | "implementer";

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
        { primitive: "tools/git-worktree-write" },
      ],
      execution: [
        { primitive: "sandbox/worktree-isolated" },
        { primitive: "control/token-budget-100k" },
      ],
      reliability: [
        { primitive: "observability/span-per-turn" },
        { primitive: "recovery/revert-on-test-fail" },
        { primitive: "emit/outerloop-evidence" },
      ],
    },
  };
}

export function stackFromPreset(preset: StackPreset, name: string): HarnessStack {
  if (preset === "implementer") return implementerStack(name);
  return minimalStack(name);
}