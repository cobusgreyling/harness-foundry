import type { McpClient } from "@cobusgreyling/harness-foundry-mcp";
import { defaultSessionPolicy, type SessionPolicy } from "./policy.js";

export type ToolTimelineEntry = {
  name: string;
  ok: boolean;
  at: string;
  outputChars: number;
};

export type SessionRuntime = {
  worktreePath?: string;
  worktreeBranch?: string;
  testCommand?: string;
  verificationPassed?: boolean;
  recoveryArmed: Set<string>;
  narrowedScope: boolean;
  host?: "cursor" | "claude-code" | "standalone";
  hostSignals?: string[];
  /** Tokens consumed this session (input+output from model). */
  tokensUsed: number;
  /** Hard cap from control/token-budget-* (default 100k). */
  maxTokens: number;
  /** Tool invocations this session. */
  toolCallsUsed: number;
  /** Hard cap from control config (default 50). */
  maxToolCalls: number;
  /** Whether write tools are allowed (composition layer). */
  writeEnabled: boolean;
  /** Model primitive id when resolved. */
  modelPrimitive?: string;
  modelConfig?: Record<string, unknown>;
  /** Optional live MCP client for tools/mcp-* primitives. */
  mcpClient?: McpClient;
  /** Tool names exposed by the connected MCP server. */
  mcpToolNames?: Set<string>;
  /** Execution policy from policy/* and sandbox/readonly primitives. */
  policy: SessionPolicy;
  /** Extra builtin tools enabled by composition primitives. */
  extraTools: Set<string>;
  /** Injected skill markdown from context/skills-dir. */
  skillsContext?: string;
  /** Append-only memory log (memory/file-log). */
  memoryLogPath?: string;
  /** Record per-tool timeline for observability/tool-timeline. */
  recordToolTimeline: boolean;
  toolTimeline: ToolTimelineEntry[];
};

export function createSessionRuntime(host?: SessionRuntime["host"]): SessionRuntime {
  return {
    recoveryArmed: new Set(),
    narrowedScope: false,
    host,
    tokensUsed: 0,
    maxTokens: 100_000,
    toolCallsUsed: 0,
    maxToolCalls: 50,
    writeEnabled: false,
    policy: defaultSessionPolicy(),
    extraTools: new Set(),
    recordToolTimeline: false,
    toolTimeline: [],
  };
}
