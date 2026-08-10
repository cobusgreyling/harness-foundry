import type { McpClient } from "@cobusgreyling/harness-foundry-mcp";

export type SessionRuntime = {
  worktreePath?: string;
  worktreeBranch?: string;
  testCommand?: string;
  verificationPassed?: boolean;
  recoveryArmed: Set<string>;
  narrowedScope: boolean;
  host?: "cursor" | "claude-code" | "standalone";
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
  };
}
