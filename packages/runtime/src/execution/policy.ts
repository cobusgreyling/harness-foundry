export type SessionPolicy = {
  /** Disallow write_file and mutating shell commands. */
  readonly: boolean;
  /** Relative path prefixes; empty means any path inside the workspace. */
  pathAllowlist: string[];
  /** Command prefixes; empty means default deny-list only. */
  commandAllowlist: string[];
  /** Redact secrets from tool output before it re-enters the model/trace. */
  secretScrub: boolean;
  /** Expand the blocked network-tool list. */
  networkDenied: boolean;
};

export function defaultSessionPolicy(): SessionPolicy {
  return {
    readonly: false,
    pathAllowlist: [],
    commandAllowlist: [],
    secretScrub: false,
    networkDenied: false,
  };
}

const ALWAYS_BLOCKED = /\brm\s+-rf\s+\//;
const DEFAULT_NETWORK = /\b(curl|wget|nc|ncat|netcat|ssh)\b/i;
const EXTRA_NETWORK = /\b(scp|sftp|ftp|telnet|nmap|ssh-keyscan|socat)\b/i;
const MUTATING_COMMAND =
  /\b(rm|rmdir|mv|chmod|chown|dd|mkfs|git\s+(commit|push|reset|rebase|checkout|add|rm)|npm\s+(publish|install)|pnpm\s+(add|remove|publish)|yarn\s+add)\b/i;

export function normalizeRelPath(relative: string): string {
  return relative.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function pathAllowed(policy: SessionPolicy, relativePath: string): boolean {
  if (policy.pathAllowlist.length === 0) return true;
  const norm = normalizeRelPath(relativePath);
  if (norm === "" || norm === ".") return true;
  return policy.pathAllowlist.some((prefix) => {
    const p = normalizeRelPath(prefix).replace(/\/$/, "");
    if (p === "" || p === ".") return true;
    return norm === p || norm.startsWith(`${p}/`);
  });
}

export function isNetworkCommand(command: string): boolean {
  return DEFAULT_NETWORK.test(command) || EXTRA_NETWORK.test(command);
}

export function isMutatingCommand(command: string): boolean {
  if (MUTATING_COMMAND.test(command)) return true;
  // Redirection to files is a write.
  return /(^|[\s])>{1,2}\s*\S+/.test(command);
}

export function commandAllowed(
  policy: SessionPolicy,
  command: string,
): { ok: boolean; reason?: string } {
  const trimmed = command.trim();
  if (!trimmed) return { ok: false, reason: "run_command requires command" };

  if (ALWAYS_BLOCKED.test(trimmed)) {
    return { ok: false, reason: "Command blocked by sandbox policy" };
  }

  if (DEFAULT_NETWORK.test(trimmed) || (policy.networkDenied && isNetworkCommand(trimmed))) {
    return { ok: false, reason: "Command blocked by network-deny policy" };
  }

  if (policy.readonly && isMutatingCommand(trimmed)) {
    return { ok: false, reason: "Command blocked by readonly sandbox" };
  }

  if (policy.commandAllowlist.length > 0) {
    const allowed = policy.commandAllowlist.some((prefix) => {
      const p = prefix.trim();
      return trimmed === p || trimmed.startsWith(`${p} `) || trimmed.startsWith(`${p}\t`);
    });
    if (!allowed) {
      return {
        ok: false,
        reason: `Command not in allowlist (${policy.commandAllowlist.join(", ")})`,
      };
    }
  }

  return { ok: true };
}

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9]{16,}\b/g,
  /\bxai-[A-Za-z0-9_-]{16,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgho_[A-Za-z0-9]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bBearer\s+[A-Za-z0-9._\-+=/]{12,}/gi,
  /(?<=(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*["']?)[^\s"']{8,}/gi,
];

export function scrubSecrets(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[redacted]");
  }
  return out;
}

export function maybeScrub(policy: SessionPolicy, text: string): string {
  return policy.secretScrub ? scrubSecrets(text) : text;
}

export function parseStringList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}
