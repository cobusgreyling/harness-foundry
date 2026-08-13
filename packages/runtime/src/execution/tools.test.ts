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

  it("search_grep finds lines and honors path allowlist", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-tools-"));
    tmpDirs.push(dir);
    await fs.mkdir(path.join(dir, "src"), { recursive: true });
    await fs.writeFile(path.join(dir, "src", "app.ts"), "const secret = 'findme';\n", "utf8");
    await fs.writeFile(path.join(dir, "other.ts"), "const secret = 'findme';\n", "utf8");
    const runtime = createSessionRuntime();
    runtime.extraTools.add("search_grep");
    runtime.policy.pathAllowlist = ["src"];

    const hit = await executeToolCall(
      { id: "1", name: "search_grep", arguments: { query: "findme" } },
      { projectRoot: dir, runtime },
    );
    expect(hit.ok).toBe(true);
    expect(hit.output).toContain("src/app.ts");
    expect(hit.output).not.toContain("other.ts");
  });

  it("blocks writes and paths outside the allowlist", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-tools-"));
    tmpDirs.push(dir);
    const runtime = createSessionRuntime();
    runtime.writeEnabled = true;
    runtime.policy.pathAllowlist = ["src"];

    const result = await executeToolCall(
      {
        id: "1",
        name: "write_file",
        arguments: { path: "secrets/x.txt", content: "nope" },
      },
      { projectRoot: dir, runtime },
    );
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/allowlist/i);
  });

  it("scrubs secrets from tool output", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-tools-"));
    tmpDirs.push(dir);
    await fs.writeFile(path.join(dir, "note.txt"), "key=sk-abcdefghijklmnopqrstuvwxyz\n", "utf8");
    const runtime = createSessionRuntime();
    runtime.policy.secretScrub = true;

    const result = await executeToolCall(
      { id: "1", name: "read_file", arguments: { path: "note.txt" } },
      { projectRoot: dir, runtime },
    );
    expect(result.ok).toBe(true);
    expect(result.output).toContain("[redacted]");
    expect(result.output).not.toContain("sk-abcdefghijklmnopqrstuvwxyz");
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
