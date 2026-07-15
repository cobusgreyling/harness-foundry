import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  TraceEventSchema,
  type LayerName,
  type TraceEvent,
  type TraceEventType,
} from "@cobusgreyling/harness-foundry-core";

export type TraceRecordInput = {
  sessionId: string;
  type: TraceEventType;
  layer?: LayerName;
  primitive?: string;
  detail?: string;
  metadata?: Record<string, unknown>;
};

export class TraceRecorder {
  constructor(private readonly tracePath: string) {}

  async record(input: TraceRecordInput): Promise<TraceEvent> {
    const event = TraceEventSchema.parse({
      id: randomUUID(),
      sessionId: input.sessionId,
      timestamp: new Date().toISOString(),
      type: input.type,
      layer: input.layer,
      primitive: input.primitive,
      detail: input.detail,
      metadata: input.metadata,
    });

    await fs.appendFile(this.tracePath, `${JSON.stringify(event)}\n`, "utf8");
    return event;
  }
}

export async function readTraceEvents(tracePath: string): Promise<TraceEvent[]> {
  let raw: string;
  try {
    raw = await fs.readFile(tracePath, "utf8");
  } catch {
    return [];
  }

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => TraceEventSchema.parse(JSON.parse(line)));
}