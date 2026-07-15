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
  it("creates .foundry scaffold with stack and hooks", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-init-"));
    tmpDirs.push(dir);

    const result = await initProject(dir, { name: "demo-app" });
    expect(result.stackName).toBe("demo-app");
    await expect(fs.access(path.join(dir, ".foundry/stack.yaml"))).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(dir, ".foundry/hooks/outerloop.yaml")),
    ).resolves.toBeUndefined();
  });
});