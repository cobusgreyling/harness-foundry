import fs from "node:fs/promises";
import path from "node:path";
import type { TraceRecorder } from "@cobusgreyling/harness-foundry-trace";

export type HostTurnInput = {
  detail?: string;
  metadata?: Record<string, unknown>;
};

export async function ingestHostTurns(options: {
  projectRoot: string;
  sessionId: string;
  recorder: TraceRecorder;
  host: string;
}): Promise<number> {
  const candidates: string[] = [];
  if (process.env.FOUNDRY_HOST_TRANSCRIPT) {
    candidates.push(process.env.FOUNDRY_HOST_TRANSCRIPT);
  }
  candidates.push(path.join(options.projectRoot, ".foundry", "host", "turns.jsonl"));

  let ingested = 0;
  for (const file of candidates) {
    let raw: string;
    try {
      raw = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }

    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      let parsed: HostTurnInput;
      try {
        parsed = JSON.parse(line) as HostTurnInput;
      } catch {
        parsed = { detail: line };
      }
      await options.recorder.record({
        sessionId: options.sessionId,
        type: "host.turn",
        layer: "reliability",
        detail: parsed.detail ?? `Host turn (${options.host})`,
        metadata: { host: options.host, source: file, ...parsed.metadata },
      });
      ingested += 1;
    }
  }

  return ingested;
}
