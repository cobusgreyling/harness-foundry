import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readTraceEvents, TraceRecorder } from "./recorder.js";

const tmpFiles: string[] = [];

afterEach(async () => {
  await Promise.all(tmpFiles.map((file) => fs.rm(file, { force: true })));
  tmpFiles.length = 0;
});

describe("TraceRecorder", () => {
  it("appends jsonl events", async () => {
    const tracePath = path.join(os.tmpdir(), `trace-${Date.now()}.jsonl`);
    tmpFiles.push(tracePath);

    const recorder = new TraceRecorder(tracePath);
    await recorder.record({
      sessionId: "00000000-0000-4000-8000-000000000001",
      type: "session.start",
      detail: "demo",
    });

    const events = await readTraceEvents(tracePath);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("session.start");
  });
});