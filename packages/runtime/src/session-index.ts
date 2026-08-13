import fs from "node:fs/promises";
import path from "node:path";
import { sessionsIndexPath } from "@cobusgreyling/harness-foundry-core";

export type SessionIndexEntry = {
  id: string;
  stackName: string;
  stackVersion?: string;
  startedAt: string;
  endedAt?: string;
  status: string;
  turnCount: number;
  host?: string;
  goal?: string;
  tokensUsed?: number;
  toolCallsUsed?: number;
};

export type SessionIndex = {
  version: 1;
  updatedAt: string;
  sessions: SessionIndexEntry[];
};

export async function loadSessionIndex(projectRoot: string): Promise<SessionIndex> {
  const file = sessionsIndexPath(projectRoot);
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as SessionIndex;
    if (!parsed || !Array.isArray(parsed.sessions)) {
      return { version: 1, updatedAt: new Date().toISOString(), sessions: [] };
    }
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      sessions: parsed.sessions,
    };
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), sessions: [] };
  }
}

export async function upsertSessionIndex(
  projectRoot: string,
  entry: SessionIndexEntry,
): Promise<string> {
  const index = await loadSessionIndex(projectRoot);
  const next = index.sessions.filter((s) => s.id !== entry.id);
  next.unshift(entry);
  const written: SessionIndex = {
    version: 1,
    updatedAt: new Date().toISOString(),
    sessions: next.slice(0, 500),
  };
  const file = sessionsIndexPath(projectRoot);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(written, null, 2)}\n`, "utf8");
  return file;
}
