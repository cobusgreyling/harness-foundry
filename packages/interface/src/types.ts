import type { PrimitiveRef } from "@cobusgreyling/harness-foundry-core";

export type ModelMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ModelCompletionRequest = {
  goal: string;
  messages: ModelMessage[];
  config?: Record<string, unknown>;
};

export type ModelCompletionResult = {
  provider: string;
  model: string;
  content: string;
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