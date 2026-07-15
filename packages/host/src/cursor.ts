import fs from "node:fs/promises";
import path from "node:path";
import type { HostSetupResult } from "./types.js";

const CURSOR_RULE = `---
description: harness-foundry composable harness runtime — stack, trace, recovery
globs:
  - "**/*"
alwaysApply: true
---

# harness-foundry

This project uses **harness-foundry** as the composable harness runtime layer.

## Session workflow

1. Validate stack: \`foundry validate\`
2. Run session: \`foundry run --goal "<goal>" --host cursor\`
3. Inspect trace: \`foundry trace show --session <id>\`
4. Evolve (report-only): \`foundry evolve report --session <id>\`

## Stack conventions

- Active stack: \`.foundry/stack.yaml\`
- Session traces: \`.foundry/sessions/<id>/trace.jsonl\`
- Implementer stacks use git worktrees + test verification + recovery

## With outerloop

Enable \`.foundry/hooks/outerloop.yaml\` to emit evidence packages for governance.
`;

const POST_RUN_HOOK = `#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLI="\${FOUNDRY_CLI:-npx @cobusgreyling/harness-foundry}"
cd "$ROOT"
GOAL="\${FOUNDRY_GOAL:-Cursor session complete}"
$CLI run --goal "$GOAL" --host cursor --project-root "$ROOT" 2>/dev/null || \\
  node "$ROOT/node_modules/@cobusgreyling/harness-foundry/dist/cli.js" run --goal "$GOAL" --host cursor
`;

export async function setupCursor(projectRoot: string): Promise<HostSetupResult> {
  const filesWritten: string[] = [];

  const rulesDir = path.join(projectRoot, ".cursor", "rules");
  await fs.mkdir(rulesDir, { recursive: true });
  const rulePath = path.join(rulesDir, "harness-foundry.mdc");
  await fs.writeFile(rulePath, CURSOR_RULE, "utf8");
  filesWritten.push(rulePath);

  const hooksDir = path.join(projectRoot, ".cursor", "hooks");
  await fs.mkdir(hooksDir, { recursive: true });
  const hookPath = path.join(hooksDir, "foundry-post-run.sh");
  await fs.writeFile(hookPath, POST_RUN_HOOK, "utf8");
  await fs.chmod(hookPath, 0o755);
  filesWritten.push(hookPath);

  return { host: "cursor", filesWritten };
}