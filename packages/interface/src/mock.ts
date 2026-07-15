import type { ModelProvider, ModelCompletionRequest, ModelCompletionResult } from "./types.js";

export const mockProvider: ModelProvider = {
  id: "model/mock",
  async complete(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
    return {
      provider: "mock",
      model: "mock-v1",
      content: `[mock] Acknowledged goal: ${request.goal}`,
      usage: { input: 0, output: 0, total: 0 },
      simulated: true,
    };
  },
};