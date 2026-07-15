import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type VerificationResult = {
  ok: boolean;
  command: string;
  output: string;
  skipped?: boolean;
};

export async function resolveTestCommand(projectRoot: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(projectRoot, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    const testScript = pkg.scripts?.test;
    if (testScript && !testScript.includes("no test specified")) {
      return "npm test";
    }
  } catch {
    // no package.json
  }

  for (const agentsPath of ["AGENTS.md", "Agents.md"]) {
    try {
      const agents = await fs.readFile(path.join(projectRoot, agentsPath), "utf8");
      const match = agents.match(/## Test commands\s*\n+([\s\S]*?)(?:\n##|\n$)/i);
      const line = match?.[1]?.trim().split("\n").find((entry) => entry.trim().length > 0)?.trim();
      if (line) return line;
    } catch {
      // no agents file
    }
  }

  return null;
}

export async function runVerification(
  cwd: string,
  command: string,
  timeoutMs = 120_000,
): Promise<VerificationResult> {
  const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
  const shellFlag = process.platform === "win32" ? "/c" : "-c";

  try {
    const { stdout, stderr } = await execFileAsync(shell, [shellFlag, command], {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, CI: "true" },
    });
    const output = `${stdout}\n${stderr}`.trim();
    return { ok: true, command, output: output.slice(0, 4000) };
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    const output = `${execError.stdout ?? ""}\n${execError.stderr ?? ""}\n${execError.message ?? ""}`.trim();
    return { ok: false, command, output: output.slice(0, 4000) };
  }
}