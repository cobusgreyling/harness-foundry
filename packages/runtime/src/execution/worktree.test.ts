import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createSessionWorktree, isGitRepo, verifyWorktreeIsolation } from "./worktree.js";

const execFileAsync = promisify(execFile);
const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tmpDirs.length = 0;
});

async function initGitRepo(dir: string): Promise<void> {
  await execFileAsync("git", ["init"], { cwd: dir });
  await execFileAsync("git", ["config", "user.email", "foundry@test.local"], { cwd: dir });
  await execFileAsync("git", ["config", "user.name", "Foundry Test"], { cwd: dir });
  await fs.writeFile(path.join(dir, "README.md"), "# test\n", "utf8");
  await execFileAsync("git", ["add", "."], { cwd: dir });
  await execFileAsync("git", ["commit", "-m", "init"], { cwd: dir });
}

describe("worktree", () => {
  it("creates isolated session worktree in git repo", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-worktree-"));
    tmpDirs.push(dir);
    await initGitRepo(dir);

    expect(await isGitRepo(dir)).toBe(true);

    const sessionId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const worktree = await createSessionWorktree(dir, sessionId);
    expect(worktree).not.toBeNull();

    const isolation = await verifyWorktreeIsolation(dir, worktree!.path);
    expect(isolation.ok).toBe(true);
  });
});