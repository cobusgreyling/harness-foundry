import { afterEach, describe, expect, it } from "vitest";
import { grokProvider, openaiCompatibleProvider, openaiProvider } from "./openai.js";

const prevOpenAI = process.env.OPENAI_API_KEY;
const prevCompat = process.env.OPENAI_COMPAT_API_KEY;
const prevXai = process.env.XAI_API_KEY;
const prevGrok = process.env.GROK_API_KEY;

afterEach(() => {
  if (prevOpenAI === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = prevOpenAI;
  if (prevCompat === undefined) delete process.env.OPENAI_COMPAT_API_KEY;
  else process.env.OPENAI_COMPAT_API_KEY = prevCompat;
  if (prevXai === undefined) delete process.env.XAI_API_KEY;
  else process.env.XAI_API_KEY = prevXai;
  if (prevGrok === undefined) delete process.env.GROK_API_KEY;
  else process.env.GROK_API_KEY = prevGrok;
});

describe("openai providers (simulated)", () => {
  it("model/openai falls back to simulated tool loop without API key", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await openaiProvider.complete({
      goal: "list the directory",
      messages: [
        { role: "system", content: "test" },
        { role: "user", content: "list the directory" },
      ],
      tools: [
        {
          name: "list_dir",
          description: "List",
          parameters: { type: "object", properties: { path: { type: "string" } } },
        },
      ],
    });
    expect(result.simulated).toBe(true);
    expect(result.provider).toBe("openai");
    expect(result.toolCalls?.length || result.content).toBeTruthy();
  });

  it("model/openai-compatible uses mock when no key", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_COMPAT_API_KEY;
    const result = await openaiCompatibleProvider.complete({
      goal: "hello",
      messages: [{ role: "user", content: "hello" }],
      config: { baseUrl: "http://localhost:11434/v1", model: "llama3" },
    });
    expect(result.simulated).toBe(true);
    expect(result.content).toMatch(/openai-compatible-simulated|Acknowledged|mock/i);
  });

  it("model/grok falls back to simulated without XAI_API_KEY", async () => {
    delete process.env.XAI_API_KEY;
    delete process.env.GROK_API_KEY;
    const result = await grokProvider.complete({
      goal: "hello",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(result.simulated).toBe(true);
    expect(result.provider).toBe("grok");
  });
});
