import { z } from "zod";

export const LayerNameSchema = z.enum([
  "interface",
  "composition",
  "execution",
  "reliability",
]);

export const PrimitiveRefSchema = z.object({
  primitive: z.string().min(1),
  version: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

export const HarnessStackSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  layers: z.object({
    interface: z.array(PrimitiveRefSchema).default([]),
    composition: z.array(PrimitiveRefSchema).default([]),
    execution: z.array(PrimitiveRefSchema).default([]),
    reliability: z.array(PrimitiveRefSchema).default([]),
  }),
});

export const PrimitiveDefinitionSchema = z.object({
  id: z.string().min(1),
  layer: LayerNameSchema,
  description: z.string(),
  defaults: z.record(z.unknown()).optional(),
});

export const TraceEventTypeSchema = z.enum([
  "session.start",
  "session.end",
  "turn.start",
  "turn.end",
  "tool.call",
  "tool.result",
  "recovery.triggered",
  "evidence.emitted",
  "stack.resolved",
  "error",
]);

export const TraceEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  timestamp: z.string().datetime(),
  type: TraceEventTypeSchema,
  layer: LayerNameSchema.optional(),
  primitive: z.string().optional(),
  detail: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const SessionManifestSchema = z.object({
  id: z.string().uuid(),
  stackName: z.string(),
  stackVersion: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  status: z.enum(["running", "completed", "failed", "recovered"]),
  turnCount: z.number().int().nonnegative(),
  tracePath: z.string(),
});

export const EvolveReportSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  generatedAt: z.string().datetime(),
  mode: z.enum(["L1-report-only", "L2-proposal"]),
  findings: z.array(
    z.object({
      severity: z.enum(["info", "warn", "critical"]),
      message: z.string(),
      primitive: z.string().optional(),
      suggestion: z.string().optional(),
    }),
  ),
});

export const EvidenceHookSchema = z.object({
  enabled: z.boolean().default(false),
  adapter: z.enum(["outerloop", "custom"]).default("outerloop"),
  emitOn: z.array(z.enum(["session.end", "turn.end"])).default(["session.end"]),
});

export type LayerName = z.infer<typeof LayerNameSchema>;
export type PrimitiveRef = z.infer<typeof PrimitiveRefSchema>;
export type HarnessStack = z.infer<typeof HarnessStackSchema>;
export type PrimitiveDefinition = z.infer<typeof PrimitiveDefinitionSchema>;
export type TraceEventType = z.infer<typeof TraceEventTypeSchema>;
export type TraceEvent = z.infer<typeof TraceEventSchema>;
export type SessionManifest = z.infer<typeof SessionManifestSchema>;
export type EvolveReport = z.infer<typeof EvolveReportSchema>;
export type EvidenceHook = z.infer<typeof EvidenceHookSchema>;