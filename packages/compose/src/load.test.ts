import { describe, expect, it } from "vitest";
import { resolveStack, validateStack } from "./load.js";
import type { HarnessStack } from "@cobusgreyling/harness-foundry-core";

const minimalStack: HarnessStack = {
  name: "minimal",
  version: "1.0.0",
  layers: {
    interface: [{ primitive: "model/mock" }],
    composition: [{ primitive: "context/state-file" }],
    execution: [{ primitive: "control/token-budget-100k" }],
    reliability: [{ primitive: "observability/span-per-turn" }],
  },
};

describe("resolveStack", () => {
  it("flattens all layer primitives", () => {
    const resolved = resolveStack(minimalStack);
    expect(resolved.primitives).toHaveLength(4);
  });
});

describe("validateStack", () => {
  it("flags empty stacks", () => {
    const empty: HarnessStack = {
      name: "empty",
      version: "0.0.0",
      layers: {
        interface: [],
        composition: [],
        execution: [],
        reliability: [],
      },
    };
    const result = validateStack(empty);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("accepts minimal stack", () => {
    const result = validateStack(minimalStack);
    expect(result.valid).toBe(true);
  });
});