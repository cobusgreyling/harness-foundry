# Trace event schema (v0.5)

Sessions append JSON lines to `.foundry/sessions/<id>/trace.jsonl`.

Each event:

| Field | Type | Notes |
|-------|------|--------|
| `id` | uuid | Event id |
| `sessionId` | uuid | Session id |
| `timestamp` | ISO-8601 | UTC |
| `type` | enum | See below |
| `layer` | enum? | `interface` \| `composition` \| `execution` \| `reliability` |
| `primitive` | string? | Primitive id when relevant |
| `detail` | string? | Human-readable summary |
| `metadata` | object? | Structured payload |

## Event types

| Type | When |
|------|------|
| `session.start` / `session.end` | Session lifecycle |
| `stack.resolved` | After stack + lock resolve |
| `turn.start` / `turn.end` | Each model↔tool turn |
| `primitive.activate` / `primitive.complete` | Setup primitives |
| `model.complete` | Model provider returned (usage, toolCallCount, simulated) |
| `tool.call` / `tool.result` | Tool invocation |
| `budget.check` / `budget.exceeded` | Token / tool-call caps |
| `verification.run` / `pass` / `fail` | Post-session test gate |
| `recovery.triggered` | Recovery primitive fired |
| `evidence.emitted` | outerloop EvidencePackage written |
| `error` | Failures |

## Versioning

Trace schema is additive. Consumers should ignore unknown `type` values.
Schema source of truth: `packages/core/src/schemas.ts` (`TraceEventTypeSchema`).
