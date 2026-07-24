import {
  getModelProvider,
  type ModelMessage,
  type ModelProvider,
  type ToolDefinition,
} from "@cobusgreyling/harness-foundry-interface";
import type { PrimitiveRef } from "@cobusgreyling/harness-foundry-core";
import type { TraceRecorder } from "@cobusgreyling/harness-foundry-trace";
import { applyTokenUsage, applyToolCalls, checkBudget } from "./budget.js";
import type { SessionRuntime } from "./runtime-state.js";
import { executeToolCall, listBuiltinTools } from "./tools.js";

export type TurnLoopContext = {
  projectRoot: string;
  sessionId: string;
  goal: string;
  recorder: TraceRecorder;
  runtime: SessionRuntime;
  modelRef: PrimitiveRef;
  maxTurns: number;
};

export type TurnLoopResult = {
  turnsCompleted: number;
  finalContent: string;
  stoppedReason: "completed" | "budget" | "max_turns" | "error";
  error?: string;
};

function buildSystemPrompt(ctx: TurnLoopContext): string {
  const cwd = ctx.runtime.worktreePath ?? ctx.projectRoot;
  const write = ctx.runtime.writeEnabled ? "enabled" : "disabled";
  return [
    "You are a harness-foundry session agent.",
    `Goal: ${ctx.goal}`,
    `Workspace: ${cwd}`,
    `Write tools: ${write}`,
    "Use tools when needed. Prefer small, verifiable changes.",
    "When finished, respond with a concise summary and no further tool calls.",
  ].join("\n");
}

function resolveProvider(ref: PrimitiveRef): ModelProvider {
  const provider = getModelProvider(ref);
  if (!provider) {
    throw new Error(`Unknown model provider: ${ref.primitive}`);
  }
  return provider;
}

export async function runTurnLoop(ctx: TurnLoopContext): Promise<TurnLoopResult> {
  const provider = resolveProvider(ctx.modelRef);
  const tools: ToolDefinition[] = listBuiltinTools({
    writeEnabled: ctx.runtime.writeEnabled,
  });

  const messages: ModelMessage[] = [
    { role: "system", content: buildSystemPrompt(ctx) },
    { role: "user", content: ctx.goal },
  ];

  let finalContent = "";
  let turnsCompleted = 0;

  for (let turn = 1; turn <= ctx.maxTurns; turn += 1) {
    turnsCompleted = turn;

    await ctx.recorder.record({
      sessionId: ctx.sessionId,
      type: "turn.start",
      detail: `Turn ${turn}`,
      metadata: {
        turn,
        tokensUsed: ctx.runtime.tokensUsed,
        toolCallsUsed: ctx.runtime.toolCallsUsed,
      },
    });

    const budgetBefore = checkBudget(ctx.runtime);
    await ctx.recorder.record({
      sessionId: ctx.sessionId,
      type: "budget.check",
      layer: "execution",
      detail: budgetBefore.ok
        ? `tokens=${budgetBefore.tokensUsed}/${budgetBefore.maxTokens} tools=${budgetBefore.toolCallsUsed}/${budgetBefore.maxToolCalls}`
        : budgetBefore.reason,
      metadata: budgetBefore,
    });

    if (!budgetBefore.ok) {
      await ctx.recorder.record({
        sessionId: ctx.sessionId,
        type: "budget.exceeded",
        layer: "execution",
        detail: budgetBefore.reason,
        metadata: budgetBefore,
      });
      await ctx.recorder.record({
        sessionId: ctx.sessionId,
        type: "turn.end",
        detail: `Turn ${turn} stopped (budget)`,
        metadata: { turn, stoppedReason: "budget" },
      });
      return {
        turnsCompleted,
        finalContent,
        stoppedReason: "budget",
        error: budgetBefore.reason,
      };
    }

    let completion;
    try {
      completion = await provider.complete({
        goal: ctx.goal,
        messages,
        tools,
        config: {
          ...ctx.runtime.modelConfig,
          ...ctx.modelRef.config,
          cwd: ctx.runtime.worktreePath ?? ctx.projectRoot,
        },
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await ctx.recorder.record({
        sessionId: ctx.sessionId,
        type: "error",
        layer: "interface",
        primitive: ctx.modelRef.primitive,
        detail,
      });
      await ctx.recorder.record({
        sessionId: ctx.sessionId,
        type: "turn.end",
        detail: `Turn ${turn} failed`,
        metadata: { turn, stoppedReason: "error" },
      });
      return {
        turnsCompleted,
        finalContent,
        stoppedReason: "error",
        error: detail,
      };
    }

    applyTokenUsage(ctx.runtime, completion.usage);

    await ctx.recorder.record({
      sessionId: ctx.sessionId,
      type: "model.complete",
      layer: "interface",
      primitive: ctx.modelRef.primitive,
      detail: (completion.content || "(tool_use)").slice(0, 400),
      metadata: {
        simulated: completion.simulated,
        stopReason: completion.stopReason,
        toolCallCount: completion.toolCalls?.length ?? 0,
        usage: completion.usage,
        tokensUsed: ctx.runtime.tokensUsed,
      },
    });

    finalContent = completion.content || finalContent;

    const toolCalls = completion.toolCalls ?? [];
    messages.push({
      role: "assistant",
      content: completion.content,
      toolCalls: toolCalls.length ? toolCalls : undefined,
    });

    if (toolCalls.length === 0 || completion.stopReason === "end") {
      await ctx.recorder.record({
        sessionId: ctx.sessionId,
        type: "turn.end",
        detail: `Turn ${turn} complete`,
        metadata: { turn, stoppedReason: "completed" },
      });
      return {
        turnsCompleted,
        finalContent,
        stoppedReason: "completed",
      };
    }

    for (const call of toolCalls) {
      const budgetMid = checkBudget(ctx.runtime);
      if (!budgetMid.ok) {
        await ctx.recorder.record({
          sessionId: ctx.sessionId,
          type: "budget.exceeded",
          layer: "execution",
          detail: budgetMid.reason,
          metadata: budgetMid,
        });
        await ctx.recorder.record({
          sessionId: ctx.sessionId,
          type: "turn.end",
          detail: `Turn ${turn} stopped (budget during tools)`,
          metadata: { turn, stoppedReason: "budget" },
        });
        return {
          turnsCompleted,
          finalContent,
          stoppedReason: "budget",
          error: budgetMid.reason,
        };
      }

      await ctx.recorder.record({
        sessionId: ctx.sessionId,
        type: "tool.call",
        layer: "composition",
        detail: `${call.name}(${JSON.stringify(call.arguments).slice(0, 200)})`,
        metadata: { toolCallId: call.id, name: call.name, arguments: call.arguments },
      });

      const result = await executeToolCall(call, {
        projectRoot: ctx.projectRoot,
        runtime: ctx.runtime,
      });
      applyToolCalls(ctx.runtime, 1);

      await ctx.recorder.record({
        sessionId: ctx.sessionId,
        type: "tool.result",
        layer: "composition",
        detail: result.output.slice(0, 400),
        metadata: {
          toolCallId: call.id,
          name: call.name,
          ok: result.ok,
          toolCallsUsed: ctx.runtime.toolCallsUsed,
        },
      });

      messages.push({
        role: "tool",
        name: call.name,
        toolCallId: call.id,
        content: result.ok ? result.output : `ERROR: ${result.output}`,
      });
    }

    await ctx.recorder.record({
      sessionId: ctx.sessionId,
      type: "turn.end",
      detail: `Turn ${turn} complete (tool_use → continue)`,
      metadata: { turn, toolCalls: toolCalls.length },
    });
  }

  return {
    turnsCompleted,
    finalContent,
    stoppedReason: "max_turns",
  };
}
