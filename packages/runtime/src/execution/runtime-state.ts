export type SessionRuntime = {
  worktreePath?: string;
  worktreeBranch?: string;
  testCommand?: string;
  verificationPassed?: boolean;
  recoveryArmed: Set<string>;
  narrowedScope: boolean;
  host?: "cursor" | "claude-code" | "standalone";
};

export function createSessionRuntime(host?: SessionRuntime["host"]): SessionRuntime {
  return {
    recoveryArmed: new Set(),
    narrowedScope: false,
    host,
  };
}