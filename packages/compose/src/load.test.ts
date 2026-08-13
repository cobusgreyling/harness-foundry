import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadMergedCatalog, resolveStack, validateStack } from "./load.js";
import { resolveStackPreset, stackFromPreset } from "./stacks.js";
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
    expect(resolveStackPreset("daily-triage")).toBe("triage");
    expect(resolveStackPreset("reviewer")).toBe("reviewer");
    expect(resolveStackPreset("loop-engineering:ci-sweeper")).toBe("ci-sweeper");
    expect(resolveStackPreset("mcp-worker")).toBe("mcp-worker");
    expect(resolveStackPreset("with-outerloop")).toBe("with-outerloop");
    expect(resolveStackPreset("loop-engineering:daily-triage")).toBe("triage");
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

describe("catalogue depth", () => {
  it("loads at least 25 primitives from the monorepo catalogue", async () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const catalog = await loadMergedCatalog(repoRoot);
    expect(catalog.size).toBeGreaterThanOrEqual(25);
    expect(catalog.has("model/grok")).toBe(true);
    expect(catalog.has("policy/path-allowlist")).toBe(true);
    expect(catalog.has("sandbox/readonly")).toBe(true);
  });

  it("new presets validate against the catalogue", async () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const catalog = await loadMergedCatalog(repoRoot);
    for (const preset of ["ci-sweeper", "mcp-worker", "with-outerloop"] as const) {
      const result = validateStack(stackFromPreset(preset, preset), catalog);
      expect(result.valid, result.errors.join("; ")).toBe(true);
    }
  });
});