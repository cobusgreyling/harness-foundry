import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { sessionDir } from "@cobusgreyling/harness-foundry-core";

const execFileAsync = promisify(execFile);

export async function isGitRepo(projectRoot: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--git-dir"], { cwd: projectRoot });
    return true;
  } catch {
    return false;
  }
}

export type WorktreeInfo = {
  path: string;
  branch: string;
};

export async function createSessionWorktree(
  projectRoot: string,
  sessionId: string,
): Promise<WorktreeInfo | null> {
  if (!(await isGitRepo(projectRoot))) return null;

  const worktreePath = path.join(sessionDir(projectRoot, sessionId), "worktree");
  const branch = `foundry/${sessionId.slice(0, 8)}`;

  await fs.mkdir(path.dirname(worktreePath), { recursive: true });

  try {
    await execFileAsync("git", ["worktree", "remove", "--force", worktreePath], {
      cwd: projectRoot,
    });
  } catch {
    // stale worktree may not exist
  }

  try {
    await execFileAsync("git", ["branch", "-D", branch], { cwd: projectRoot });
  } catch {
    // branch may not exist
  }

  await execFileAsync("git", ["worktree", "add", "-b", branch, worktreePath, "HEAD"], {
    cwd: projectRoot,
  });

  return { path: worktreePath, branch };
}

export async function verifyWorktreeIsolation(
  projectRoot: string,
  worktreePath: string,
): Promise<{ ok: boolean; detail: string }> {
  const resolvedProject = path.resolve(projectRoot);
  const resolvedWorktree = path.resolve(worktreePath);

  if (resolvedWorktree === resolvedProject) {
    return { ok: false, detail: "Worktree path equals project root — not isolated" };
  }

  try {
    const { stdout: listOut } = await execFileAsync(
      "git",
      ["worktree", "list", "--porcelain"],
      { cwd: projectRoot },
    );
    const registered = await Promise.all(
      listOut
        .split("\n")
        .filter((line) => line.startsWith("worktree "))
        .map(async (line) => {
          const listed = line.slice("worktree ".length).trim();
          try {
            return await fs.realpath(listed);
          } catch {
            return path.resolve(listed);
          }
        }),
    );
    let resolvedRegistered = resolvedWorktree;
    try {
      resolvedRegistered = await fs.realpath(worktreePath);
    } catch {
      // keep resolvedWorktree
    }
    if (!registered.includes(resolvedRegistered)) {
      return { ok: false, detail: "Worktree not registered in git worktree list" };
    }

    await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: worktreePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: `Worktree verification failed: ${message}` };
  }

  return { ok: true, detail: `Isolated worktree at ${worktreePath}` };
}

export async function revertWorktreeChanges(worktreePath: string): Promise<void> {
  await execFileAsync("git", ["checkout", "."], { cwd: worktreePath });
  await execFileAsync("git", ["clean", "-fd"], { cwd: worktreePath });
}

export async function removeSessionWorktree(
  projectRoot: string,
  sessionId: string,
  worktreePath: string,
): Promise<void> {
  if (!(await isGitRepo(projectRoot))) return;

  try {
    await execFileAsync("git", ["worktree", "remove", "--force", worktreePath], {
      cwd: projectRoot,
    });
  } catch {
    // best-effort cleanup
  }

  const branch = `foundry/${sessionId.slice(0, 8)}`;
  try {
    await execFileAsync("git", ["branch", "-D", branch], { cwd: projectRoot });
  } catch {
    // branch may already be gone
  }
}