# CLI reference

## `foundry init`

Scaffold `.foundry/` in the current directory.

| Flag | Default | Description |
|------|---------|-------------|
| `--name` | directory name | Stack name |
| `--from` | `minimal` | Preset: `minimal` \| `implementer` |

## `foundry validate`

Validate `.foundry/stack.yaml` against the primitive catalogue. Exits `1` on errors.

## `foundry stack show`

Display the active stack by layer.

## `foundry primitives list`

List merged primitives from bundled catalogue, project `primitives/`, and `.foundry/primitives/`.

## `foundry sessions list`

List sessions under `.foundry/sessions/` with status and turn count.

## `foundry run`

Execute a harness session.

| Flag | Default | Description |
|------|---------|-------------|
| `--goal` | generic goal | Session objective |
| `--turns` | `1` | Turn count |
| `--dry-run` | off | Lifecycle only, no primitive activation |

## `foundry trace show --session <id>`

Print `trace.jsonl` events for a session.

## `foundry evolve report --session <id>`

L1 report-only analysis. Writes `.foundry/evolve/reports/<id>.json`.

## `foundry evolve proposal --session <id>`

L2 proposal YAML. Human review required before apply. Writes `.foundry/evolve/proposals/<id>.yaml`.