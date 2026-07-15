import { describe, expect, it } from "vitest";
import { HarnessStackSchema, PrimitiveRefSchema } from "./schemas.js";

describe("HarnessStackSchema", () => {
  it("accepts a minimal four-layer stack", () => {
    const stack = {
      name: "minimal",
      version: "1.0.0",
      layers: {
        interface: [{ primitive: "model/mock" }],
        composition: [{ primitive: "context/state-file" }],
        execution: [{ primitive: "control/token-budget-100k" }],
        reliability: [{ primitive: "observability/span-per-turn" }],
      },
    };
    expect(HarnessStackSchema.parse(stack).name).toBe("minimal");
  });
});

describe("PrimitiveRefSchema", () => {
  it("accepts optional config", () => {
    const ref = PrimitiveRefSchema.parse({
      primitive: "control/token-budget-100k",
      config: { maxTokens: 50_000 },
    });
    expect(ref.config?.maxTokens).toBe(50_000);
  });
});