import { describe, expect, it } from "vitest";
import { getModelProvider } from "./registry.js";
import { mockProvider } from "./mock.js";

describe("getModelProvider", () => {
  it("resolves mock provider", () => {
    expect(getModelProvider({ primitive: "model/mock" })?.id).toBe(mockProvider.id);
  });
});