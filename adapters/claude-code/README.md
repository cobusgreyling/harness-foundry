# Claude Code adapter

Host shim for running foundry stacks inside Claude Code sessions.

## Install

```bash
foundry host integrate claude-code
# or during init:
foundry init --from implementer --with-claude-code
```

## Usage

```bash
foundry host detect
foundry run --goal "Implement feature X" --host claude-code
```

Writes:

- `CLAUDE.md` fragment — harness commands and conventions
- `.claude/settings.foundry.json` — suggested permissions
- `.claude/foundry-post-run.sh` — optional post-run session hook