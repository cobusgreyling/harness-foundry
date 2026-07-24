import type { PrimitiveRef } from "@cobusgreyling/harness-foundry-core";

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ModelMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  /** Present when role is tool — id of the tool call this message answers. */
  toolCallId?: string;
  /** Present when role is assistant and the model requested tools. */
  toolCalls?: ToolCall[];
  name?: string;
};

export type ModelCompletionRequest = {
  goal: string;
  messages: ModelMessage[];
  tools?: ToolDefinition[];
  config?: Record<string, unknown>;
};

export type ModelStopReason = "end" | "tool_use" | "max_tokens" | "error";

export type ModelCompletionResult = {
  provider: string;
  model: string;
  content: string;
  toolCalls?: ToolCall[];
  stopReason?: ModelStopReason;
  usage?: { input: number; output: number; total: number };
  simulated: boolean;
};

export type ModelProvider = {
  id: string;
  complete(request: ModelCompletionRequest): Promise<ModelCompletionResult>;
};

export function modelPrimitiveId(ref: PrimitiveRef): string | null {
  return ref.primitive.startsWith("model/") ? ref.primitive : null;
}
