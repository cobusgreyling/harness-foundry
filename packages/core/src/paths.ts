import path from "node:path";

export const FOUNDRY_DIR = ".foundry";

export function foundryDir(projectRoot: string): string {
  return path.join(projectRoot, FOUNDRY_DIR);
}

export function stackPath(projectRoot: string): string {
  return path.join(foundryDir(projectRoot), "stack.yaml");
}

export function stackLockPath(projectRoot: string): string {
  return path.join(foundryDir(projectRoot), "stack.lock");
}

export function sessionsDir(projectRoot: string): string {
  return path.join(foundryDir(projectRoot), "sessions");
}

export function sessionsIndexPath(projectRoot: string): string {
  return path.join(sessionsDir(projectRoot), "index.json");
}

export function sessionDir(projectRoot: string, sessionId: string): string {
  return path.join(sessionsDir(projectRoot), sessionId);
}

export function sessionManifestPath(projectRoot: string, sessionId: string): string {
  return path.join(sessionDir(projectRoot, sessionId), "manifest.json");
}

export function sessionTracePath(projectRoot: string, sessionId: string): string {
  return path.join(sessionDir(projectRoot, sessionId), "trace.jsonl");
}

export function evolveReportsDir(projectRoot: string): string {
  return path.join(foundryDir(projectRoot), "evolve", "reports");
}

export function evolveProposalsDir(projectRoot: string): string {
  return path.join(foundryDir(projectRoot), "evolve", "proposals");
}

export function evolveAppliedDir(projectRoot: string): string {
  return path.join(foundryDir(projectRoot), "evolve", "applied");
}

export function hooksDir(projectRoot: string): string {
  return path.join(foundryDir(projectRoot), "hooks");
}