import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import {
  saveStackToFile,
  stackFromPreset,
  type StackPreset,
  writeStackLock,
  loadMergedCatalog,
} from "@cobusgreyling/harness-foundry-compose";
import { foundryDir, hooksDir, stackPath } from "@cobusgreyling/harness-foundry-core";

export type InitOptions = {
  name?: string;
  from?: StackPreset;
};

export type InitResult = {
  projectRoot: string;
  stackName: string;
  preset: StackPreset;
  filesWritten: string[];
};

function defaultStackName(projectRoot: string, override?: string): string {
  return override ?? path.basename(projectRoot);
}

export async function initProject(cwd: string, options: InitOptions = {}): Promise<InitResult> {
  const preset = options.from ?? "minimal";
  const stackName = defaultStackName(cwd, options.name);
  const stack = stackFromPreset(preset, stackName);
  const filesWritten: string[] = [];

  const dirs = [
    foundryDir(cwd),
    path.join(foundryDir(cwd), "sessions"),
    path.join(foundryDir(cwd), "primitives"),
    path.join(foundryDir(cwd), "evolve", "reports"),
    path.join(foundryDir(cwd), "evolve", "proposals"),
    hooksDir(cwd),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  const stackFile = stackPath(cwd);
  await saveStackToFile(stack, stackFile);
  filesWritten.push(stackFile);

  const catalog = await loadMergedCatalog(cwd);
  const lockFile = await writeStackLock(cwd, stack, catalog);
  filesWritten.push(lockFile);

  const hookFile = path.join(hooksDir(cwd), "outerloop.yaml");
  await fs.writeFile(
    hookFile,
    YAML.stringify({
      enabled: false,
      adapter: "outerloop",
      emitOn: ["session.end"],
    }),
    "utf8",
  );
  filesWritten.push(hookFile);

  const stateFile = path.join(foundryDir(cwd), "state", "STATE.md");
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(
    stateFile,
    `# ${stackName} — Harness State\n\n- Preset: ${preset}\n- Initialized: ${new Date().toISOString()}\n`,
    "utf8",
  );
  filesWritten.push(stateFile);

  return { projectRoot: cwd, stackName, preset, filesWritten };
}