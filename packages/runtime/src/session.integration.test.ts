import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { afterEach, describe, expect, it } from "vitest";
import {
  minimalStack,
  saveStackToFile,
  writeStackLock,
  loadMergedCatalog,
} from "@cobusgreyling/harness-foundry-compose";
import { foundryDir, hooksDir, stackPath } from "@cobusgreyling/harness-foundry-core";
import { readTraceEvents } from "@cobusgreyling/harness-foundry-trace";
import { runSession } from "./session.js";
import type { HarnessStack } from "@cobusgreyling/harness-foundry-core";

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tmpDirs.length = 0;
});

async function scaffoldProject(dir: string): Promise<void> {
  await fs.mkdir(path.join(foundryDir(dir), "state"), { recursive: true });
  await fs.mkdir(path.join(foundryDir(dir), "sessions"), { recursive: true });
  await fs.mkdir(hooksDir(dir), { recursive: true });
  await fs.writeFile(
    path.join(hooksDir(dir), "outerloop.yaml"),
    YAML.stringify({ enabled: false, adapter: "outerloop", emitOn: ["session.end"] }),
    "utf8",
  );
  const stack = minimalStack("e2e");
  await saveStackToFile(stack, stackPath(dir));
  const catalog = await loadMergedCatalog(dir);
  await writeStackLock(dir, stack, catalog);
}

describe("session integration", () => {
  it("scaffold → run → trace → stack.lock", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-e2e-"));
    tmpDirs.push(dir);

    await scaffoldProject(dir);
    const result = await runSession({
      projectRoot: dir,
      goal: "integration test",
      turns: 1,
    });

    expect(result.manifest.status).toBe("completed");
    const events = await readTraceEvents(result.manifest.tracePath);
    expect(events.some((e) => e.type === "primitive.activate")).toBe(true);
    expect(events.some((e) => e.type === "model.complete")).toBe(true);
    expect(events.some((e) => e.type === "session.end")).toBe(true);

    const lock = JSON.parse(
      await fs.readFile(path.join(dir, ".foundry", "stack.lock"), "utf8"),
    );
    expect(lock.entries.length).toBeGreaterThan(0);

    expect(events.some((e) => e.type === "host.bridge")).toBe(true);
    const index = JSON.parse(
      await fs.readFile(path.join(dir, ".foundry", "sessions", "index.json"), "utf8"),
    ) as { sessions: Array<{ id: string }> };
    expect(index.sessions[0]?.id).toBe(result.manifest.id);
  });

  it("tool loop writes files for implement goals", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-e2e-"));
    tmpDirs.push(dir);

    await scaffoldProject(dir);
    const stack: HarnessStack = {
      ...minimalStack("e2e-write"),
      layers: {
        ...minimalStack("e2e-write").layers,
        composition: [
          { primitive: "context/state-file" },
          { primitive: "tools/git-worktree-write" },
        ],
      },
    };
    await saveStackToFile(stack, stackPath(dir));
    const catalog = await loadMergedCatalog(dir);
    await writeStackLock(dir, stack, catalog);

    const result = await runSession({
      projectRoot: dir,
      goal: "Implement a note file path: notes/from-session.md",
      turns: 3,
    });

    expect(["completed", "recovered"]).toContain(result.manifest.status);
    const events = await readTraceEvents(result.manifest.tracePath);
    expect(events.some((e) => e.type === "tool.call")).toBe(true);
    expect(events.some((e) => e.type === "tool.result")).toBe(true);

    // Without git, write goes to project root
    const written = await fs.readFile(path.join(dir, "notes/from-session.md"), "utf8");
    expect(written).toContain("Mock implementer note");
  });
});