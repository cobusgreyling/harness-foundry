import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveTestCommand } from "./verify.js";

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tmpDirs.length = 0;
});

describe("resolveTestCommand", () => {
  it("reads npm test from package.json", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-verify-"));
    tmpDirs.push(dir);
    await fs.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({ scripts: { test: "vitest run" } }),
      "utf8",
    );
    expect(await resolveTestCommand(dir)).toBe("npm test");
  });

  it("reads AGENTS.md test commands", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-verify-"));
    tmpDirs.push(dir);
    await fs.writeFile(path.join(dir, "AGENTS.md"), "## Test commands\nnpm test\n", "utf8");
    expect(await resolveTestCommand(dir)).toBe("npm test");
  });
});