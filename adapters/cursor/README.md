# Cursor adapter

Host shim for running foundry stacks inside Cursor agent sessions.

## Install

```bash
foundry host integrate cursor
# or during init:
foundry init --from implementer --with-cursor
```

## Usage

```bash
foundry host detect
foundry run --goal "Implement feature X" --host cursor
```

Writes:

- `.cursor/rules/harness-foundry.mdc` — harness conventions for the agent
- `.cursor/hooks/foundry-post-run.sh` — optional post-run session hook