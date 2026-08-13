import { describe, expect, it } from "vitest";
import {
  commandAllowed,
  defaultSessionPolicy,
  pathAllowed,
  scrubSecrets,
} from "./policy.js";

describe("pathAllowed", () => {
  it("allows everything when the list is empty", () => {
    const policy = defaultSessionPolicy();
    expect(pathAllowed(policy, "src/index.ts")).toBe(true);
  });

  it("restricts to prefixes", () => {
    const policy = { ...defaultSessionPolicy(), pathAllowlist: ["src", "tests"] };
    expect(pathAllowed(policy, "src/a.ts")).toBe(true);
    expect(pathAllowed(policy, "tests/a.ts")).toBe(true);
    expect(pathAllowed(policy, "secrets/key")).toBe(false);
  });
});

describe("commandAllowed", () => {
  it("blocks rm -rf / and network tools", () => {
    const policy = defaultSessionPolicy();
    expect(commandAllowed(policy, "rm -rf /").ok).toBe(false);
    expect(commandAllowed(policy, "curl https://example.com").ok).toBe(false);
  });

  it("enforces command allowlist", () => {
    const policy = { ...defaultSessionPolicy(), commandAllowlist: ["git", "pwd"] };
    expect(commandAllowed(policy, "git status").ok).toBe(true);
    expect(commandAllowed(policy, "npm publish").ok).toBe(false);
  });

  it("blocks mutating commands in readonly mode", () => {
    const policy = { ...defaultSessionPolicy(), readonly: true };
    expect(commandAllowed(policy, "pwd").ok).toBe(true);
    expect(commandAllowed(policy, "rm notes.md").ok).toBe(false);
    expect(commandAllowed(policy, "echo hi > out.txt").ok).toBe(false);
  });

  it("expands network deny when enabled", () => {
    const policy = { ...defaultSessionPolicy(), networkDenied: true };
    expect(commandAllowed(policy, "scp file host:").ok).toBe(false);
  });
});

describe("scrubSecrets", () => {
  it("redacts common secret shapes", () => {
    const text = "token=sk-abcdefghijklmnopqrstuvwxyz OPENAI_API_KEY=supersecretvalue";
    const scrubbed = scrubSecrets(text);
    expect(scrubbed).not.toContain("sk-abcdefghijklmnopqrstuvwxyz");
    expect(scrubbed).toContain("[redacted]");
  });
});
