import { randomUUID } from "node:crypto";
import type {
  ModelProvider,
  ModelCompletionRequest,
  ModelCompletionResult,
  ModelMessage,
  ToolCall,
  ToolDefinition,
} from "./types.js";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    };

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
};

function toAnthropicTools(tools: ToolDefinition[] | undefined) {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object",
      ...(t.parameters ?? { properties: {} }),
    },
  }));
}

function toAnthropicMessages(messages: ModelMessage[]): AnthropicMessage[] {
  const out: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") continue;

    if (msg.role === "user") {
      out.push({ role: "user", content: msg.content });
      continue;
    }

    if (msg.role === "assistant") {
      if (msg.toolCalls?.length) {
        const blocks: AnthropicContentBlock[] = [];
        if (msg.content) blocks.push({ type: "text", text: msg.content });
        for (const call of msg.toolCalls) {
          blocks.push({
            type: "tool_use",
            id: call.id,
            name: call.name,
            input: call.arguments,
          });
        }
        out.push({ role: "assistant", content: blocks });
      } else {
        out.push({ role: "assistant", content: msg.content });
      }
      continue;
    }

    if (msg.role === "tool") {
      const block: AnthropicContentBlock = {
        type: "tool_result",
        tool_use_id: msg.toolCallId ?? "unknown",
        content: msg.content,
      };
      const last = out[out.length - 1];
      if (last?.role === "user" && Array.isArray(last.content)) {
        (last.content as AnthropicContentBlock[]).push(block);
      } else {
        out.push({ role: "user", content: [block] });
      }
    }
  }

  if (out.length === 0) {
    out.push({ role: "user", content: "Continue." });
  }

  return out;
}

function systemFromMessages(messages: ModelMessage[]): string | undefined {
  const parts = messages.filter((m) => m.role === "system").map((m) => m.content);
  return parts.length ? parts.join("\n\n") : undefined;
}

export const anthropicProvider: ModelProvider = {
  id: "model/anthropic",
  async complete(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = (request.config?.model as string | undefined) ?? DEFAULT_MODEL;
    const maxTokens = Number(request.config?.maxTokens ?? 1024);

    if (!apiKey) {
      // Fall through to mock-like behavior when no key — keep sessions runnable.
      const { mockProvider } = await import("./mock.js");
      const simulated = await mockProvider.complete(request);
      return {
        ...simulated,
        provider: "anthropic",
        model,
        content: `[anthropic-simulated] Set ANTHROPIC_API_KEY to call ${model}. ${simulated.content}`,
        simulated: true,
      };
    }

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages: toAnthropicMessages(request.messages),
    };

    const system = systemFromMessages(request.messages);
    if (system) body.system = system;

    const tools = toAnthropicTools(request.tools);
    if (tools?.length) body.tools = tools;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
    }

    const data = (await response.json()) as {
      content?: Array<{
        type: string;
        text?: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
      }>;
      stop_reason?: string;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const textParts: string[] = [];
    const toolCalls: ToolCall[] = [];

    for (const block of data.content ?? []) {
      if (block.type === "text" && block.text) {
        textParts.push(block.text);
      } else if (block.type === "tool_use" && block.name) {
        toolCalls.push({
          id: block.id ?? `call_${randomUUID().slice(0, 8)}`,
          name: block.name,
          arguments: block.input ?? {},
        });
      }
    }

    const input = data.usage?.input_tokens ?? 0;
    const output = data.usage?.output_tokens ?? 0;
    const stopReason =
      data.stop_reason === "tool_use" || toolCalls.length > 0
        ? "tool_use"
        : data.stop_reason === "max_tokens"
          ? "max_tokens"
          : "end";

    return {
      provider: "anthropic",
      model,
      content: textParts.join("\n") || (toolCalls.length ? "" : "(empty response)"),
      toolCalls: toolCalls.length ? toolCalls : undefined,
      stopReason,
      usage: { input, output, total: input + output },
      simulated: false,
    };
  },
};
