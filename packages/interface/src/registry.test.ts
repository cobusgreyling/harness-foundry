import { describe, expect, it } from "vitest";
import { getModelProvider, listModelProviders } from "./registry.js";
import { mockProvider } from "./mock.js";

describe("getModelProvider", () => {
  it("resolves mock provider", () => {
    expect(getModelProvider({ primitive: "model/mock" })?.id).toBe(mockProvider.id);
  });

  it("resolves openai and openai-compatible", () => {
    expect(getModelProvider({ primitive: "model/openai" })?.id).toBe("model/openai");
    expect(getModelProvider({ primitive: "model/openai-compatible" })?.id).toBe(
      "model/openai-compatible",
    );
  });

  it("resolves grok", () => {
    expect(getModelProvider({ primitive: "model/grok" })?.id).toBe("model/grok");
  });

  it("lists at least five providers", () => {
    expect(listModelProviders().length).toBeGreaterThanOrEqual(5);
  });
});
