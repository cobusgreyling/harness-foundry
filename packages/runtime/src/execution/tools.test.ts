import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSessionRuntime } from "./runtime-state.js";
import { executeToolCall, listBuiltinTools } from "./tools.js";

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tmpDirs.length = 0;
});

describe("builtin tools", () => {
  it("lists tools and hides write when disabled", () => {
    expect(listBuiltinTools().map((t) => t.name)).toContain("write_file");
    expect(listBuiltinTools({ writeEnabled: false }).map((t) => t.name)).not.toContain(
      "write_file",
    );
  });

  it("reads and writes within workspace", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-tools-"));
    tmpDirs.push(dir);
    const runtime = createSessionRuntime();
    runtime.writeEnabled = true;

    const write = await executeToolCall(
      {
        id: "1",
        name: "write_file",
        arguments: { path: "hello.txt", content: "hi" },
      },
      { projectRoot: dir, runtime },
    );
    expect(write.ok).toBe(true);

    const read = await executeToolCall(
      { id: "2", name: "read_file", arguments: { path: "hello.txt" } },
      { projectRoot: dir, runtime },
    );
    expect(read.ok).toBe(true);
    expect(read.output).toBe("hi");
  });

  it("blocks path traversal", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-tools-"));
    tmpDirs.push(dir);
    const runtime = createSessionRuntime();
    runtime.writeEnabled = true;

    const result = await executeToolCall(
      {
        id: "1",
        name: "read_file",
        arguments: { path: "../secret" },
      },
      { projectRoot: dir, runtime },
    );
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/escapes workspace/i);
  });

  it("denies write when not enabled", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-tools-"));
    tmpDirs.push(dir);
    const runtime = createSessionRuntime();

    const result = await executeToolCall(
      {
        id: "1",
        name: "write_file",
        arguments: { path: "x.txt", content: "nope" },
      },
      { projectRoot: dir, runtime },
    );
    expect(result.ok).toBe(false);
  });
});
