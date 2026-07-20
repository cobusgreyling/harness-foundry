import { describe, expect, it } from "vitest";
import { resolveStack, validateStack } from "./load.js";
import { resolveStackPreset } from "./stacks.js";
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

describe("resolveStackPreset", () => {
  it("maps loop-engineering aliases", () => {
    expect(resolveStackPreset("minimal")).toBe("minimal");
    expect(resolveStackPreset("implementer")).toBe("implementer");
    expect(resolveStackPreset("daily-triage")).toBe("minimal");
    expect(resolveStackPreset("loop-engineering:ci-sweeper")).toBe("implementer");
    expect(resolveStackPreset("loop-engineering:daily-triage")).toBe("minimal");
    expect(resolveStackPreset("unknown-pattern")).toBe("minimal");
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