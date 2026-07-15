import type { ModelProvider, ModelCompletionRequest, ModelCompletionResult } from "./types.js";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export const anthropicProvider: ModelProvider = {
  id: "model/anthropic",
  async complete(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = (request.config?.model as string | undefined) ?? DEFAULT_MODEL;

    if (!apiKey) {
      return {
        provider: "anthropic",
        model,
        content: `[anthropic-simulated] Set ANTHROPIC_API_KEY to call ${model}. Goal: ${request.goal}`,
        usage: { input: 0, output: 0, total: 0 },
        simulated: true,
      };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: request.goal }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const text =
      data.content?.find((c) => c.type === "text")?.text ?? "(empty response)";
    const input = data.usage?.input_tokens ?? 0;
    const output = data.usage?.output_tokens ?? 0;

    return {
      provider: "anthropic",
      model,
      content: text,
      usage: { input, output, total: input + output },
      simulated: false,
    };
  },
};