import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import {
  foundryDir,
  hooksDir,
  stackPath,
  type HarnessStack,
} from "@cobusgreyling/harness-foundry-core";
import { saveStackToFile } from "@cobusgreyling/harness-foundry-compose";

export type InitOptions = {
  name?: string;
  stack?: "minimal";
};

export type InitResult = {
  projectRoot: string;
  stackName: string;
  filesWritten: string[];
};

function defaultStackName(projectRoot: string, override?: string): string {
  return override ?? path.basename(projectRoot);
}

export function minimalStack(name: string): HarnessStack {
  return {
    name,
    version: "1.0.0",
    description: "Smallest reliable harness stack",
    layers: {
      interface: [{ primitive: "model/mock" }],
      composition: [{ primitive: "context/state-file" }],
      execution: [
        { primitive: "control/token-budget-100k" },
        { primitive: "sandbox/worktree-isolated" },
      ],
      reliability: [
        { primitive: "observability/span-per-turn" },
        { primitive: "emit/outerloop-evidence" },
      ],
    },
  };
}

export async function initProject(cwd: string, options: InitOptions = {}): Promise<InitResult> {
  const stackName = defaultStackName(cwd, options.name);
  const stack = minimalStack(stackName);
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
    `# ${stackName} — Harness State\n\n- Initialized: ${new Date().toISOString()}\n`,
    "utf8",
  );
  filesWritten.push(stateFile);

  return { projectRoot: cwd, stackName, filesWritten };
}