import { describe, expect, it } from "vitest";
import { detectHost, resolveHost } from "./detect.js";

describe("detectHost", () => {
  it("returns standalone by default", async () => {
    const prev = { ...process.env };
    delete process.env.CURSOR_TRACE_ID;
    delete process.env.CLAUDE_CODE;

    const detection = await detectHost("/tmp/nonexistent-foundry-project");
    expect(detection.host).toBe("standalone");

    process.env = prev;
  });

  it("detects cursor from env", async () => {
    const prev = process.env.CURSOR_TRACE_ID;
    process.env.CURSOR_TRACE_ID = "test-trace";
    const detection = await detectHost();
    expect(detection.host).toBe("cursor");
    process.env.CURSOR_TRACE_ID = prev;
  });

  it("resolveHost honors explicit host", async () => {
    expect(await resolveHost("claude-code")).toBe("claude-code");
  });
});