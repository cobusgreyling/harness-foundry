# CLI reference

## `foundry init`

Scaffold `.foundry/` in the current directory.

| Flag | Default | Description |
|------|---------|-------------|
| `--name` | directory name | Stack name |
| `--from` | `minimal` | Preset: `minimal` \| `implementer` \| `reviewer` \| `triage` \| `ci-sweeper` \| `mcp-worker` \| `with-outerloop` |
| `--dry-run` | off | Preview files without writing |

## `foundry validate`

Validate `.foundry/stack.yaml` against the primitive catalogue. Exits `1` on errors.

## `foundry stack show`

Display the active stack by layer.

## `foundry primitives list`

List merged primitives from bundled catalogue, project `primitives/`, and `.foundry/primitives/`.

## `foundry sessions list`

List sessions from `.foundry/sessions/index.json` (falls back to directory scan). Skips `index.json`.

## `foundry run`

Execute a harness session.

| Flag | Default | Description |
|------|---------|-------------|
| `--goal` | generic goal | Session objective |
| `--turns` | `8` | Max model↔tool turns |
| `--host` | `auto` | `auto` \| `standalone` \| `cursor` \| `claude-code` |
| `--dry-run` | off | Lifecycle only, no primitive activation |
| `-C, --project-root` | cwd | Project root (global flag; used by host hooks) |

## `foundry trace show --session <id>`

Print `trace.jsonl` events for a session.

## `foundry trace replay --session <id>`

Render the same trace as a short narrative.

## `foundry completion [bash|zsh|fish]`

Print a shell completion script. Install with:

```bash
# zsh
echo 'eval "$(foundry completion zsh)"' >> ~/.zshrc
```

## `foundry evolve report --session <id>`

L1 report-only analysis. Writes `.foundry/evolve/reports/<id>.json`.

## `foundry evolve proposal --session <id>`

L2 proposal YAML. Human review required before apply. Writes `.foundry/evolve/proposals/<id>.yaml`.

## `foundry evolve apply --proposal <id> --yes`

Apply an L2 proposal after human review. Requires `--yes`. Writes an audit file under `.foundry/evolve/applied/`.