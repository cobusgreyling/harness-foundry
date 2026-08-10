import { describe, expect, it } from "vitest";
import {
  applyTokenUsage,
  applyToolCalls,
  checkBudget,
  parseBudgetConfig,
} from "./budget.js";
import { createSessionRuntime } from "./runtime-state.js";

describe("budget", () => {
  it("parses config with defaults", () => {
    expect(parseBudgetConfig()).toEqual({ maxTokens: 100_000, maxToolCalls: 50 });
    expect(parseBudgetConfig({ maxTokens: 10, maxToolCalls: 2 })).toEqual({
      maxTokens: 10,
      maxToolCalls: 2,
    });
  });

  it("tracks tokens and tool calls", () => {
    const runtime = createSessionRuntime();
    runtime.maxTokens = 100;
    runtime.maxToolCalls = 2;

    applyTokenUsage(runtime, { total: 40 });
    expect(checkBudget(runtime).ok).toBe(true);

    applyToolCalls(runtime, 2);
    const exceeded = checkBudget(runtime);
    expect(exceeded.ok).toBe(false);
    expect(exceeded.reason).toMatch(/Tool-call budget/);

    runtime.toolCallsUsed = 0;
    applyTokenUsage(runtime, { input: 50, output: 50 });
    expect(checkBudget(runtime).ok).toBe(false);
  });
});
