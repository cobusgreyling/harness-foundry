import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bridgeHostSession } from "./bridge.js";

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tmpDirs.length = 0;
});

describe("bridgeHostSession", () => {
  it("records host.bridge and ingested host.turn events", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-bridge-"));
    tmpDirs.push(dir);

    // Runtime does not export initProject — scaffold the minimal files here.
    await fs.mkdir(path.join(dir, ".foundry", "hooks"), { recursive: true });
    await fs.mkdir(path.join(dir, ".foundry", "host"), { recursive: true });
    await fs.mkdir(path.join(dir, ".foundry", "state"), { recursive: true });
    await fs.mkdir(path.join(dir, ".foundry", "sessions"), { recursive: true });
    await fs.writeFile(
      path.join(dir, ".foundry", "hooks", "outerloop.yaml"),
      "enabled: false\nadapter: outerloop\nemitOn: [session.end]\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(dir, ".foundry", "stack.yaml"),
      [
        "name: bridge",
        "version: 1.0.0",
        "layers:",
        "  interface:",
        "    - primitive: model/mock",
        "  composition:",
        "    - primitive: context/state-file",
        "  execution:",
        "    - primitive: control/token-budget-100k",
        "  reliability:",
        "    - primitive: observability/span-per-turn",
        "",
      ].join("\n"),
      "utf8",
    );
    await fs.writeFile(
      path.join(dir, ".foundry", "host", "turns.jsonl"),
      `${JSON.stringify({ detail: "User asked to implement X", metadata: { role: "user" } })}\n`,
      "utf8",
    );

    const result = await bridgeHostSession({
      projectRoot: dir,
      goal: "bridge test",
      turns: 1,
      host: "standalone",
    });

    const raw = await fs.readFile(result.manifest.tracePath, "utf8");
    expect(raw).toContain("host.bridge");
    expect(raw).toContain("implement X");
  });
});
