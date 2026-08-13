import { describe, expect, it } from "vitest";
import { formatTraceReplay } from "./replay.js";
import type { TraceEvent } from "@cobusgreyling/harness-foundry-core";

describe("formatTraceReplay", () => {
  it("renders a short narrative", () => {
    const events: TraceEvent[] = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        sessionId: "22222222-2222-4222-8222-222222222222",
        timestamp: "2026-08-13T00:00:00.000Z",
        type: "session.start",
        detail: "demo goal",
      },
      {
        id: "11111111-1111-4111-8111-111111111112",
        sessionId: "22222222-2222-4222-8222-222222222222",
        timestamp: "2026-08-13T00:00:01.000Z",
        type: "host.bridge",
        detail: "Host standalone",
      },
      {
        id: "11111111-1111-4111-8111-111111111113",
        sessionId: "22222222-2222-4222-8222-222222222222",
        timestamp: "2026-08-13T00:00:02.000Z",
        type: "session.end",
        detail: "Session complete",
      },
    ];
    const out = formatTraceReplay(events);
    expect(out).toMatch(/Session start/);
    expect(out).toMatch(/Host bridge/);
    expect(out).toMatch(/Session end/);
  });
});
