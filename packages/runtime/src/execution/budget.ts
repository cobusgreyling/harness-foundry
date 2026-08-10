import type { SessionRuntime } from "./runtime-state.js";

export type BudgetStatus = {
  ok: boolean;
  reason?: string;
  tokensUsed: number;
  maxTokens: number;
  toolCallsUsed: number;
  maxToolCalls: number;
};

export function checkBudget(runtime: SessionRuntime): BudgetStatus {
  if (runtime.tokensUsed >= runtime.maxTokens) {
    return {
      ok: false,
      reason: `Token budget exceeded (${runtime.tokensUsed}/${runtime.maxTokens})`,
      tokensUsed: runtime.tokensUsed,
      maxTokens: runtime.maxTokens,
      toolCallsUsed: runtime.toolCallsUsed,
      maxToolCalls: runtime.maxToolCalls,
    };
  }
  if (runtime.toolCallsUsed >= runtime.maxToolCalls) {
    return {
      ok: false,
      reason: `Tool-call budget exceeded (${runtime.toolCallsUsed}/${runtime.maxToolCalls})`,
      tokensUsed: runtime.tokensUsed,
      maxTokens: runtime.maxTokens,
      toolCallsUsed: runtime.toolCallsUsed,
      maxToolCalls: runtime.maxToolCalls,
    };
  }
  return {
    ok: true,
    tokensUsed: runtime.tokensUsed,
    maxTokens: runtime.maxTokens,
    toolCallsUsed: runtime.toolCallsUsed,
    maxToolCalls: runtime.maxToolCalls,
  };
}

export function applyTokenUsage(
  runtime: SessionRuntime,
  usage?: { input?: number; output?: number; total?: number },
): void {
  if (!usage) return;
  const total =
    usage.total ??
    (Number(usage.input ?? 0) + Number(usage.output ?? 0));
  runtime.tokensUsed += Math.max(0, total);
}

export function applyToolCalls(runtime: SessionRuntime, count: number): void {
  runtime.toolCallsUsed += Math.max(0, count);
}

export function parseBudgetConfig(config?: Record<string, unknown>): {
  maxTokens: number;
  maxToolCalls: number;
} {
  const maxTokens = Number(config?.maxTokens ?? 100_000);
  const maxToolCalls = Number(config?.maxToolCalls ?? 50);
  return {
    maxTokens: Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : 100_000,
    maxToolCalls: Number.isFinite(maxToolCalls) && maxToolCalls > 0 ? maxToolCalls : 50,
  };
}
