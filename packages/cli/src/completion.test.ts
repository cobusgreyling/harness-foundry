import { describe, expect, it } from "vitest";
import { renderCompletionScript } from "./completion.js";

describe("renderCompletionScript", () => {
  it("emits bash completion with core commands", () => {
    const script = renderCompletionScript("bash");
    expect(script).toContain("complete -F _foundry_completions foundry");
    expect(script).toContain("init");
    expect(script).toContain("ci-sweeper");
  });

  it("emits fish completions", () => {
    const script = renderCompletionScript("fish");
    expect(script).toContain("complete -c foundry");
    expect(script).toContain("mcp-worker");
  });
});
