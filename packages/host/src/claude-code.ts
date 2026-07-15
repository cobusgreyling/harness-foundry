import fs from "node:fs/promises";
import path from "node:path";
import type { HostSetupResult } from "./types.js";

const CLAUDE_FRAGMENT = `# harness-foundry

This project uses **harness-foundry** for composable harness runtime sessions.

## Commands

- \`foundry validate\` — check \`.foundry/stack.yaml\`
- \`foundry run --goal "<goal>" --host claude-code\` — run session with trace
- \`foundry trace show --session <id>\` — inspect trace
- \`foundry evolve report --session <id>\` — L1 evolution report

Implementer stacks create git worktrees, run verification tests, and apply recovery on failure.
`;

const POST_RUN_HOOK = `#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="\${FOUNDRY_CLI:-npx @cobusgreyling/harness-foundry}"
cd "$ROOT"
GOAL="\${FOUNDRY_GOAL:-Claude Code session complete}"
$CLI run --goal "$GOAL" --host claude-code --project-root "$ROOT" 2>/dev/null || \\
  node "$ROOT/node_modules/@cobusgreyling/harness-foundry/dist/cli.js" run --goal "$GOAL" --host claude-code
`;

const SETTINGS_FRAGMENT = `{
  "permissions": {
    "allow": [
      "Bash(foundry *)",
      "Bash(npx @cobusgreyling/harness-foundry *)"
    ]
  }
}
`;

export async function setupClaudeCode(projectRoot: string): Promise<HostSetupResult> {
  const filesWritten: string[] = [];

  const claudeMdPath = path.join(projectRoot, "CLAUDE.md");
  try {
    await fs.access(claudeMdPath);
    const existing = await fs.readFile(claudeMdPath, "utf8");
    if (!existing.includes("harness-foundry")) {
      await fs.writeFile(claudeMdPath, `${existing.trimEnd()}\n\n---\n\n${CLAUDE_FRAGMENT}`, "utf8");
      filesWritten.push(claudeMdPath);
    }
  } catch {
    await fs.writeFile(claudeMdPath, CLAUDE_FRAGMENT, "utf8");
    filesWritten.push(claudeMdPath);
  }

  const claudeDir = path.join(projectRoot, ".claude");
  await fs.mkdir(claudeDir, { recursive: true });

  const settingsPath = path.join(claudeDir, "settings.foundry.json");
  await fs.writeFile(settingsPath, SETTINGS_FRAGMENT, "utf8");
  filesWritten.push(settingsPath);

  const hookPath = path.join(claudeDir, "foundry-post-run.sh");
  await fs.writeFile(hookPath, POST_RUN_HOOK, "utf8");
  await fs.chmod(hookPath, 0o755);
  filesWritten.push(hookPath);

  return { host: "claude-code", filesWritten };
}