import type { PrimitiveRef } from "@cobusgreyling/harness-foundry-core";
import type { TraceRecorder } from "@cobusgreyling/harness-foundry-trace";
import type { SessionRuntime } from "./execution/runtime-state.js";

export type PrimitiveActivateContext = {
  projectRoot: string;
  sessionId: string;
  goal: string;
  recorder: TraceRecorder;
  runtime: SessionRuntime;
};

export type PrimitiveHandlerResult = {
  ok: boolean;
  detail: string;
  /** When true, built-in handler is skipped. */
  handled: boolean;
};

export type PrimitiveHandler = (
  ref: PrimitiveRef,
  ctx: PrimitiveActivateContext,
) => Promise<PrimitiveHandlerResult> | PrimitiveHandlerResult;

const handlers = new Map<string, PrimitiveHandler>();

/** Register a custom primitive handler (id exact match, e.g. `tools/my-tool`). */
export function registerPrimitiveHandler(id: string, handler: PrimitiveHandler): void {
  handlers.set(id, handler);
}

export function unregisterPrimitiveHandler(id: string): void {
  handlers.delete(id);
}

export function listPrimitiveHandlers(): string[] {
  return [...handlers.keys()].sort();
}

export async function tryPrimitiveHandler(
  ref: PrimitiveRef,
  ctx: PrimitiveActivateContext,
): Promise<PrimitiveHandlerResult | null> {
  const handler = handlers.get(ref.primitive);
  if (!handler) return null;
  const result = await handler(ref, ctx);
  return { ...result, handled: true };
}

/** Clear all plugin handlers (tests). */
export function clearPrimitiveHandlers(): void {
  handlers.clear();
}
