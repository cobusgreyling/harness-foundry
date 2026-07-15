import type { PrimitiveRef } from "@cobusgreyling/harness-foundry-core";
import { anthropicProvider } from "./anthropic.js";
import { mockProvider } from "./mock.js";
import type { ModelProvider } from "./types.js";

const providers = new Map<string, ModelProvider>([
  [mockProvider.id, mockProvider],
  [anthropicProvider.id, anthropicProvider],
]);

export function getModelProvider(ref: PrimitiveRef): ModelProvider | null {
  return providers.get(ref.primitive) ?? null;
}

export function listModelProviders(): ModelProvider[] {
  return [...providers.values()];
}