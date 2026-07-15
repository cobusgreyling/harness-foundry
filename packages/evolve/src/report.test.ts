import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateEvolveReport } from "./report.js";
import { TraceRecorder } from "@cobusgreyling/harness-foundry-trace";

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tmpDirs.length = 0;
});

describe("generateEvolveReport", () => {
  it("writes L1 report from trace", async () => {
    const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-evolve-"));
    tmpDirs.push(projectRoot);

    const sessionId = "00000000-0000-4000-8000-000000000099";
    const tracePath = path.join(projectRoot, "trace.jsonl");
    const recorder = new TraceRecorder(tracePath);
    await recorder.record({ sessionId, type: "session.start" });
    await recorder.record({ sessionId, type: "session.end" });

    const report = await generateEvolveReport({ projectRoot, sessionId, tracePath });
    expect(report.mode).toBe("L1-report-only");
    expect(report.findings.length).toBeGreaterThan(0);
  });
});