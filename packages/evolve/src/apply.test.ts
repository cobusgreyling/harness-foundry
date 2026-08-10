import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";
import { applyEvolveProposal } from "./apply.js";

const temps: string[] = [];

afterEach(async () => {
  for (const t of temps.splice(0)) {
    await fs.rm(t, { recursive: true, force: true });
  }
});

async function fixtureProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "foundry-apply-"));
  temps.push(root);
  const foundry = path.join(root, ".foundry");
  await fs.mkdir(path.join(foundry, "evolve", "proposals"), { recursive: true });
  await fs.writeFile(
    path.join(foundry, "stack.yaml"),
    YAML.stringify({
      name: "t",
      version: "1.0.0",
      layers: {
        interface: [{ primitive: "model/mock" }],
        composition: [],
        execution: [],
        reliability: [],
      },
    }),
    "utf8",
  );
  return root;
}

describe("applyEvolveProposal", () => {
  it("refuses without --yes", async () => {
    const root = await fixtureProject();
    await expect(
      applyEvolveProposal({ projectRoot: root, proposal: "x", yes: false }),
    ).rejects.toThrow(/Human gate/);
  });

  it("applies additions and writes audit", async () => {
    const root = await fixtureProject();
    const id = "11111111-1111-1111-1111-111111111111";
    const proposalPath = path.join(root, ".foundry", "evolve", "proposals", `${id}.yaml`);
    await fs.writeFile(
      proposalPath,
      [
        `id: ${id}`,
        "reportId: 22222222-2222-2222-2222-222222222222",
        "sessionId: 33333333-3333-3333-3333-333333333333",
        "summary: test",
        "additions:",
        "  - primitive: control/tool-call-cap",
        "  - primitive: recovery/revert-on-test-fail",
      ].join("\n"),
      "utf8",
    );

    const result = await applyEvolveProposal({
      projectRoot: root,
      proposal: id,
      yes: true,
    });

    expect(result.added.map((a) => a.primitive).sort()).toEqual([
      "control/tool-call-cap",
      "recovery/revert-on-test-fail",
    ]);
    const stackRaw = await fs.readFile(path.join(root, ".foundry", "stack.yaml"), "utf8");
    expect(stackRaw).toContain("control/tool-call-cap");
    expect(stackRaw).toContain("recovery/revert-on-test-fail");
    const audit = JSON.parse(await fs.readFile(result.auditPath, "utf8")) as {
      proposalId: string;
    };
    expect(audit.proposalId).toBe(id);
  });
});
