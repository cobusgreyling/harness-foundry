import type { PrimitiveRef } from "@cobusgreyling/harness-foundry-core";
import { anthropicProvider } from "./anthropic.js";
import { mockProvider } from "./mock.js";
import { grokProvider, openaiCompatibleProvider, openaiProvider } from "./openai.js";
import type { ModelProvider } from "./types.js";

const providers = new Map<string, ModelProvider>([
  [mockProvider.id, mockProvider],
  [anthropicProvider.id, anthropicProvider],
  [openaiProvider.id, openaiProvider],
  [openaiCompatibleProvider.id, openaiCompatibleProvider],
  [grokProvider.id, grokProvider],
]);

/** Register or replace a model provider (plugin / test hook). */
export function registerModelProvider(provider: ModelProvider): void {
  providers.set(provider.id, provider);
}

export function getModelProvider(ref: PrimitiveRef): ModelProvider | null {
  return providers.get(ref.primitive) ?? null;
}

export function listModelProviders(): ModelProvider[] {
  return [...providers.values()];
}
