import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TraceRecorder } from "@cobusgreyling/harness-foundry-trace";
import { createSessionRuntime } from "./runtime-state.js";
import { runTurnLoop } from "./turn-loop.js";

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tmpDirs.length = 0;
});

describe("runTurnLoop", () => {
  it("runs model → tool → model for implement goals", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-loop-"));
    tmpDirs.push(dir);
    const tracePath = path.join(dir, "trace.jsonl");
    const recorder = new TraceRecorder(tracePath);
    const runtime = createSessionRuntime();
    runtime.writeEnabled = true;

    const result = await runTurnLoop({
      projectRoot: dir,
      sessionId: "00000000-0000-4000-8000-000000000001",
      goal: "Implement a note file path: notes/hello.md",
      recorder,
      runtime,
      modelRef: { primitive: "model/mock" },
      maxTurns: 3,
    });

    expect(result.stoppedReason).toBe("completed");
    expect(result.turnsCompleted).toBeGreaterThanOrEqual(2);
    expect(runtime.toolCallsUsed).toBeGreaterThanOrEqual(1);

    const note = await fs.readFile(path.join(dir, "notes/hello.md"), "utf8");
    expect(note).toContain("Mock implementer note");

    const raw = await fs.readFile(tracePath, "utf8");
    expect(raw).toContain("model.complete");
    expect(raw).toContain("tool.call");
    expect(raw).toContain("tool.result");
  });

  it("stops when tool budget is exhausted", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-loop-"));
    tmpDirs.push(dir);
    const tracePath = path.join(dir, "trace.jsonl");
    const recorder = new TraceRecorder(tracePath);
    const runtime = createSessionRuntime();
    runtime.writeEnabled = true;
    runtime.maxToolCalls = 0;

    const result = await runTurnLoop({
      projectRoot: dir,
      sessionId: "00000000-0000-4000-8000-000000000002",
      goal: "Implement a note",
      recorder,
      runtime,
      modelRef: { primitive: "model/mock" },
      maxTurns: 2,
    });

    // budget checked before model; maxToolCalls=0 means immediately exceeded
    // Actually checkBudget: toolCallsUsed >= maxToolCalls → 0 >= 0 is true, so budget exceeded
    expect(result.stoppedReason).toBe("budget");
  });
});
