import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import {
  resolveStackPreset,
  saveStackToFile,
  stackFromPreset,
  type StackPreset,
  writeStackLock,
  loadMergedCatalog,
} from "@cobusgreyling/harness-foundry-compose";
import { setupClaudeCode, setupCursor } from "@cobusgreyling/harness-foundry-host";
import { foundryDir, hooksDir, stackPath } from "@cobusgreyling/harness-foundry-core";

export type InitOptions = {
  name?: string;
  /** Preset name, LE pattern, or `loop-engineering:<pattern>` alias. */
  from?: StackPreset | string;
  withCursor?: boolean;
  withClaudeCode?: boolean;
  /** Preview paths only; write nothing. */
  dryRun?: boolean;
};

export type InitResult = {
  projectRoot: string;
  stackName: string;
  preset: StackPreset;
  filesWritten: string[];
  integrations: string[];
};

function defaultStackName(projectRoot: string, override?: string): string {
  return override ?? path.basename(projectRoot);
}

export async function initProject(cwd: string, options: InitOptions = {}): Promise<InitResult> {
  const preset = resolveStackPreset(options.from ?? "minimal");
  const stackName = defaultStackName(cwd, options.name);
  const stack = stackFromPreset(preset, stackName);
  const filesWritten: string[] = [];
  const integrations: string[] = [];

  const dirs = [
    foundryDir(cwd),
    path.join(foundryDir(cwd), "sessions"),
    path.join(foundryDir(cwd), "primitives"),
    path.join(foundryDir(cwd), "evolve", "reports"),
    path.join(foundryDir(cwd), "evolve", "proposals"),
    path.join(foundryDir(cwd), "evolve", "applied"),
    hooksDir(cwd),
  ];

  const stackFile = stackPath(cwd);
  const hookFile = path.join(hooksDir(cwd), "outerloop.yaml");
  const stateFile = path.join(foundryDir(cwd), "state", "STATE.md");
  const lockFile = path.join(foundryDir(cwd), "stack.lock");

  if (options.dryRun) {
    filesWritten.push(stackFile, lockFile, hookFile, stateFile);
    if (options.withCursor) {
      filesWritten.push(
        path.join(cwd, ".cursor", "rules", "harness-foundry.mdc"),
        path.join(cwd, ".cursor", "hooks", "foundry-post-run.sh"),
      );
      integrations.push("cursor");
    }
    if (options.withClaudeCode) {
      filesWritten.push(path.join(cwd, ".claude", "harness-foundry.md"));
      integrations.push("claude-code");
    }
    return { projectRoot: cwd, stackName, preset, filesWritten, integrations };
  }

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  await saveStackToFile(stack, stackFile);
  filesWritten.push(stackFile);

  const catalog = await loadMergedCatalog(cwd);
  const writtenLock = await writeStackLock(cwd, stack, catalog);
  filesWritten.push(writtenLock);

  await fs.writeFile(
    hookFile,
    YAML.stringify({
      enabled: preset === "with-outerloop",
      adapter: "outerloop",
      emitOn: ["session.end"],
    }),
    "utf8",
  );
  filesWritten.push(hookFile);

  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(
    stateFile,
    `# ${stackName} — Harness State\n\n- Preset: ${preset}\n- Initialized: ${new Date().toISOString()}\n`,
    "utf8",
  );
  filesWritten.push(stateFile);

  if (options.withCursor) {
    const cursor = await setupCursor(cwd);
    integrations.push("cursor");
    filesWritten.push(...cursor.filesWritten);
  }

  if (options.withClaudeCode) {
    const claude = await setupClaudeCode(cwd);
    integrations.push("claude-code");
    filesWritten.push(...claude.filesWritten);
  }

  return { projectRoot: cwd, stackName, preset, filesWritten, integrations };
}
