import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initProject } from "./init-project.js";

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tmpDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
  tmpDirs.length = 0;
});

describe("initProject", () => {
  it("creates .foundry scaffold with stack, lock, and hooks", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-init-"));
    tmpDirs.push(dir);

    const result = await initProject(dir, { name: "demo-app", from: "implementer" });
    expect(result.stackName).toBe("demo-app");
    expect(result.preset).toBe("implementer");
    await expect(fs.access(path.join(dir, ".foundry/stack.yaml"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(dir, ".foundry/stack.lock"))).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(dir, ".foundry/hooks/outerloop.yaml")),
    ).resolves.toBeUndefined();
  });
});