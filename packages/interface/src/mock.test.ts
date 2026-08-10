import { describe, expect, it } from "vitest";
import { mockProvider } from "./mock.js";
import type { ToolDefinition } from "./types.js";

const tools: ToolDefinition[] = [
  {
    name: "write_file",
    description: "write",
    parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } } },
  },
  {
    name: "list_dir",
    description: "list",
    parameters: { type: "object", properties: { path: { type: "string" } } },
  },
  {
    name: "read_file",
    description: "read",
    parameters: { type: "object", properties: { path: { type: "string" } } },
  },
];

describe("mockProvider tool loop", () => {
  it("acknowledges simple goals without tools", async () => {
    const result = await mockProvider.complete({
      goal: "Hello",
      messages: [{ role: "user", content: "Hello" }],
      tools,
    });
    expect(result.stopReason).toBe("end");
    expect(result.toolCalls).toBeUndefined();
    expect(result.content).toContain("Hello");
  });

  it("requests write_file for implement goals", async () => {
    const result = await mockProvider.complete({
      goal: "Implement a note file path: notes/hello.md",
      messages: [{ role: "user", content: "Implement a note" }],
      tools,
    });
    expect(result.stopReason).toBe("tool_use");
    expect(result.toolCalls?.[0]?.name).toBe("write_file");
  });

  it("finishes after tool results", async () => {
    const result = await mockProvider.complete({
      goal: "Implement a note",
      messages: [
        { role: "user", content: "Implement a note" },
        {
          role: "assistant",
          content: "writing",
          toolCalls: [{ id: "c1", name: "write_file", arguments: { path: "x", content: "y" } }],
        },
        { role: "tool", name: "write_file", toolCallId: "c1", content: "Wrote x" },
      ],
      tools,
    });
    expect(result.stopReason).toBe("end");
    expect(result.content).toContain("Completed goal");
  });
});
