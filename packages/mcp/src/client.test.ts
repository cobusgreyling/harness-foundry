import { describe, expect, it } from "vitest";
import { McpClient } from "./client.js";

describe("McpClient", () => {
  it("lists default stub tools", async () => {
    const tools = await new McpClient().listTools();
    expect(tools.length).toBeGreaterThan(0);
  });
});