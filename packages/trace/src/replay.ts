import type { TraceEvent } from "@cobusgreyling/harness-foundry-core";

/** Render a session trace as a short narrative (no raw JSONL). */
export function formatTraceReplay(events: TraceEvent[]): string {
  if (events.length === 0) return "No events.";

  const lines: string[] = [];
  for (const event of events) {
    const label = event.primitive ? `${event.type} (${event.primitive})` : event.type;
    switch (event.type) {
      case "session.start":
        lines.push(`Session start — ${event.detail ?? "goal"}`);
        break;
      case "host.bridge":
        lines.push(`Host bridge — ${event.detail ?? "standalone"}`);
        break;
      case "host.turn":
        lines.push(`  host.turn ${event.detail ?? ""}`.trimEnd());
        break;
      case "stack.resolved":
        lines.push(`Stack resolved — ${event.detail ?? ""}`);
        break;
      case "turn.start":
        lines.push(`Turn ${String(event.metadata?.turn ?? "?")} start`);
        break;
      case "model.complete":
        lines.push(`  model: ${(event.detail ?? "").slice(0, 160)}`);
        break;
      case "tool.call":
        lines.push(`  → ${event.detail ?? "tool"}`);
        break;
      case "tool.result":
        lines.push(`  ← ${event.detail ?? ""}`.slice(0, 180));
        break;
      case "policy.denied":
        lines.push(`  ✗ policy denied: ${event.detail ?? ""}`);
        break;
      case "budget.exceeded":
        lines.push(`  budget exceeded: ${event.detail ?? ""}`);
        break;
      case "turn.end":
        lines.push(`Turn end — ${event.detail ?? "complete"}`);
        break;
      case "session.end":
        lines.push(`Session end — ${event.detail ?? "complete"}`);
        break;
      default:
        if (event.type.startsWith("primitive.")) {
          lines.push(`  ${label}${event.detail ? `: ${event.detail}` : ""}`);
        }
        break;
    }
  }
  return lines.join("\n");
}
