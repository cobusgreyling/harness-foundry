import { afterEach, describe, expect, it } from "vitest";
import {
  clearPrimitiveHandlers,
  listPrimitiveHandlers,
  registerPrimitiveHandler,
  tryPrimitiveHandler,
} from "./plugins.js";
import { createSessionRuntime } from "./execution/runtime-state.js";
import type { TraceRecorder } from "@cobusgreyling/harness-foundry-trace";

const noopRecorder = {
  async record() {
    /* no-op */
  },
} as unknown as TraceRecorder;

afterEach(() => {
  clearPrimitiveHandlers();
});

describe("primitive plugin registry", () => {
  it("registers and invokes handlers", async () => {
    registerPrimitiveHandler("tools/custom", async () => ({
      ok: true,
      detail: "custom ok",
      handled: true,
    }));
    expect(listPrimitiveHandlers()).toContain("tools/custom");
    const result = await tryPrimitiveHandler(
      { primitive: "tools/custom" },
      {
        projectRoot: "/tmp",
        sessionId: "00000000-0000-0000-0000-000000000001",
        goal: "x",
        recorder: noopRecorder,
        runtime: createSessionRuntime("standalone"),
      },
    );
    expect(result?.handled).toBe(true);
    expect(result?.detail).toBe("custom ok");
  });
});
