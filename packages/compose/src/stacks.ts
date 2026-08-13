import type { HarnessStack } from "@cobusgreyling/harness-foundry-core";

export type StackPreset =
  | "minimal"
  | "implementer"
  | "reviewer"
  | "triage"
  | "ci-sweeper"
  | "mcp-worker"
  | "with-outerloop";

/** loop-engineering pattern / alias → stack preset (LE → Foundry funnel). */
const PRESET_ALIASES: Record<string, StackPreset> = {
  minimal: "minimal",
  implementer: "implementer",
  reviewer: "reviewer",
  triage: "triage",
  "ci-sweeper": "ci-sweeper",
  "mcp-worker": "mcp-worker",
  "with-outerloop": "with-outerloop",
  "daily-triage": "triage",
  "issue-triage": "triage",
  "changelog-drafter": "minimal",
  "pr-babysitter": "implementer",
  "dependency-sweeper": "ci-sweeper",
  "post-merge-cleanup": "ci-sweeper",
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
        { primitive: "tools/search-grep" },
      ],
      execution: [
        { primitive: "sandbox/readonly" },
        { primitive: "policy/secret-scrub" },
        { primitive: "control/token-budget-50k" },
        { primitive: "control/tool-call-cap", config: { maxToolCalls: 15 } },
      ],
      reliability: [
        { primitive: "observability/span-per-turn" },
        { primitive: "observability/tool-timeline" },
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
        { primitive: "tools/search-grep" },
      ],
      execution: [
        { primitive: "control/token-budget-50k" },
        { primitive: "control/tool-call-cap", config: { maxToolCalls: 10 } },
      ],
      reliability: [
        { primitive: "observability/span-per-turn" },
        { primitive: "emit/outerloop-evidence" },
      ],
    },
  };
}

export function ciSweeperStack(name: string): HarnessStack {
  return {
    name,
    version: "1.0.0",
    description: "Read-only CI sweeper — inspect, grep, and run allowlisted commands",
    layers: {
      interface: [{ primitive: "model/mock" }],
      composition: [
        { primitive: "context/state-file" },
        { primitive: "context/agents-md" },
        { primitive: "tools/search-grep" },
      ],
      execution: [
        { primitive: "sandbox/readonly" },
        {
          primitive: "policy/path-allowlist",
          config: { paths: [".github", "tests", "src", "packages", "scripts"] },
        },
        {
          primitive: "policy/command-allowlist",
          config: { commands: ["git", "npm test", "pnpm test", "pnpm lint", "pwd", "ls"] },
        },
        { primitive: "policy/secret-scrub" },
        { primitive: "control/network-deny" },
        { primitive: "control/token-budget-50k" },
        { primitive: "control/tool-call-cap", config: { maxToolCalls: 20 } },
      ],
      reliability: [
        { primitive: "observability/span-per-turn" },
        { primitive: "observability/tool-timeline" },
        { primitive: "emit/outerloop-evidence" },
      ],
    },
  };
}

export function mcpWorkerStack(name: string): HarnessStack {
  return {
    name,
    version: "1.0.0",
    description: "MCP-first tool loop (stdio server + builtins)",
    layers: {
      interface: [{ primitive: "model/mock" }],
      composition: [
        { primitive: "context/state-file" },
        { primitive: "tools/mcp-stdio" },
        { primitive: "tools/search-grep" },
      ],
      execution: [
        { primitive: "control/token-budget-50k" },
        { primitive: "control/tool-call-cap", config: { maxToolCalls: 25 } },
        { primitive: "policy/secret-scrub" },
      ],
      reliability: [
        { primitive: "observability/span-per-turn" },
        { primitive: "observability/tool-timeline" },
        { primitive: "emit/outerloop-evidence" },
      ],
    },
  };
}

export function withOuterloopStack(name: string): HarnessStack {
  return {
    name,
    version: "1.0.0",
    description: "Implementer loop with outerloop evidence emission enabled",
    layers: {
      interface: [{ primitive: "model/mock" }],
      composition: [
        { primitive: "context/state-file" },
        { primitive: "context/agents-md" },
        { primitive: "memory/file-log" },
        { primitive: "tools/git-worktree-write" },
      ],
      execution: [
        { primitive: "sandbox/worktree-isolated" },
        { primitive: "control/token-budget-100k" },
        { primitive: "control/tool-call-cap", config: { maxToolCalls: 40 } },
        { primitive: "policy/secret-scrub" },
      ],
      reliability: [
        { primitive: "observability/span-per-turn" },
        { primitive: "observability/tool-timeline" },
        { primitive: "recovery/retry-once" },
        { primitive: "recovery/revert-on-test-fail" },
        { primitive: "emit/outerloop-evidence" },
      ],
    },
  };
}

export function stackFromPreset(preset: StackPreset, name: string): HarnessStack {
  if (preset === "implementer") return implementerStack(name);
  if (preset === "reviewer") return reviewerStack(name);
  if (preset === "triage") return triageStack(name);
  if (preset === "ci-sweeper") return ciSweeperStack(name);
  if (preset === "mcp-worker") return mcpWorkerStack(name);
  if (preset === "with-outerloop") return withOuterloopStack(name);
  return minimalStack(name);
}
