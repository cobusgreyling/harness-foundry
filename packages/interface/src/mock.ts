import { randomUUID } from "node:crypto";
import type {
  ModelProvider,
  ModelCompletionRequest,
  ModelCompletionResult,
  ToolCall,
  ToolDefinition,
} from "./types.js";

function hasTool(tools: ToolDefinition[] | undefined, name: string): boolean {
  return Boolean(tools?.some((t) => t.name === name));
}

function lastToolRound(messages: ModelCompletionRequest["messages"]): boolean {
  return messages.some((m) => m.role === "tool");
}

/**
 * Deterministic mock provider that exercises the tool loop without an API key.
 *
 * Heuristics (first match wins when no prior tool results):
 * - goal mentions write/create/implement + write_file tool → write a note file
 * - goal mentions list/ls + list_dir → list_dir
 * - goal mentions read/inspect + read_file → read_file on STATE.md or path in goal
 * - otherwise → final text acknowledgment
 *
 * After any tool result is present, returns a final summary (stopReason: end).
 */
export const mockProvider: ModelProvider = {
  id: "model/mock",
  async complete(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
    const tools = request.tools ?? [];
    const goal = request.goal;
    const usage = {
      input: Math.max(1, Math.ceil(goal.length / 4)),
      output: 24,
      total: 0,
    };
    usage.total = usage.input + usage.output;

    if (lastToolRound(request.messages)) {
      const toolNames = request.messages
        .filter((m) => m.role === "tool")
        .map((m) => m.name ?? "tool");
      return {
        provider: "mock",
        model: "mock-v1",
        content: `[mock] Completed goal after tools: ${toolNames.join(", ")}. Goal: ${goal}`,
        stopReason: "end",
        usage,
        simulated: true,
      };
    }

    const toolCalls: ToolCall[] = [];
    const lower = goal.toLowerCase();

    if (
      hasTool(tools, "write_file") &&
      /\b(write|create|implement|edit|patch|update file)\b/i.test(goal)
    ) {
      const pathMatch = goal.match(/(?:path|file)\s*[:=]\s*([^\s]+)/i);
      const target = pathMatch?.[1] ?? ".foundry/state/MOCK_NOTE.md";
      toolCalls.push({
        id: `call_${randomUUID().slice(0, 8)}`,
        name: "write_file",
        arguments: {
          path: target,
          content: `# Mock implementer note\n\nGoal: ${goal}\n`,
        },
      });
    } else if (hasTool(tools, "list_dir") && /\b(list|ls|directory|tree)\b/i.test(goal)) {
      toolCalls.push({
        id: `call_${randomUUID().slice(0, 8)}`,
        name: "list_dir",
        arguments: { path: "." },
      });
    } else if (hasTool(tools, "read_file") && /\b(read|inspect|open|cat)\b/i.test(goal)) {
      const pathMatch = goal.match(/(?:path|file)\s*[:=]\s*([^\s]+)/i);
      toolCalls.push({
        id: `call_${randomUUID().slice(0, 8)}`,
        name: "read_file",
        arguments: { path: pathMatch?.[1] ?? ".foundry/state/STATE.md" },
      });
    } else if (hasTool(tools, "search_grep") && /\b(search|grep|find|rg)\b/i.test(lower)) {
      const queryMatch = goal.match(/(?:search|grep|find|rg)\s+["']?([^\s"']+)/i);
      toolCalls.push({
        id: `call_${randomUUID().slice(0, 8)}`,
        name: "search_grep",
        arguments: { query: queryMatch?.[1] ?? "TODO", path: "." },
      });
    } else if (hasTool(tools, "run_command") && /\b(run|test|npm|pnpm|shell)\b/i.test(lower)) {
      toolCalls.push({
        id: `call_${randomUUID().slice(0, 8)}`,
        name: "run_command",
        arguments: { command: "pwd" },
      });
    }

    if (toolCalls.length > 0) {
      return {
        provider: "mock",
        model: "mock-v1",
        content: `[mock] Requesting ${toolCalls.map((c) => c.name).join(", ")}`,
        toolCalls,
        stopReason: "tool_use",
        usage,
        simulated: true,
      };
    }

    return {
      provider: "mock",
      model: "mock-v1",
      content: `[mock] Acknowledged goal: ${goal}`,
      stopReason: "end",
      usage,
      simulated: true,
    };
  },
};
