import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadSessionIndex, upsertSessionIndex } from "./session-index.js";

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tmpDirs.length = 0;
});

describe("session index", () => {
  it("upserts and reloads entries newest-first", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-index-"));
    tmpDirs.push(dir);

    await upsertSessionIndex(dir, {
      id: "11111111-1111-1111-1111-111111111111",
      stackName: "minimal",
      startedAt: "2026-08-01T00:00:00.000Z",
      status: "completed",
      turnCount: 1,
    });
    await upsertSessionIndex(dir, {
      id: "22222222-2222-2222-2222-222222222222",
      stackName: "minimal",
      startedAt: "2026-08-02T00:00:00.000Z",
      status: "completed",
      turnCount: 2,
      host: "standalone",
    });

    const index = await loadSessionIndex(dir);
    expect(index.sessions[0]?.id).toBe("22222222-2222-2222-2222-222222222222");
    expect(index.sessions).toHaveLength(2);
  });
});
