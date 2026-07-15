import fs from "node:fs/promises";
import path from "node:path";

export type HostKind = "cursor" | "claude-code" | "standalone";

export type HostDetection = {
  host: HostKind;
  signals: string[];
};

export async function detectHost(projectRoot = process.cwd()): Promise<HostDetection> {
  const signals: string[] = [];

  if (process.env.CURSOR_TRACE_ID || process.env.CURSOR_AGENT || process.env.CURSOR_SESSION_ID) {
    signals.push("cursor environment variable");
    return { host: "cursor", signals };
  }

  if (
    process.env.CLAUDE_CODE ||
    process.env.CLAUDE_SESSION_ID ||
    process.env.CLAUDECODE
  ) {
    signals.push("claude-code environment variable");
    return { host: "claude-code", signals };
  }

  try {
    await fs.access(path.join(projectRoot, ".cursor", "rules"));
    signals.push(".cursor/rules present");
    return { host: "cursor", signals };
  } catch {
    // not cursor project
  }

  try {
    await fs.access(path.join(projectRoot, ".claude"));
    signals.push(".claude directory present");
    return { host: "claude-code", signals };
  } catch {
    // not claude project
  }

  return { host: "standalone", signals: ["no host signals detected"] };
}

export async function resolveHost(
  requested: "auto" | HostKind,
  projectRoot = process.cwd(),
): Promise<HostKind> {
  if (requested !== "auto") return requested;
  const detection = await detectHost(projectRoot);
  return detection.host;
}