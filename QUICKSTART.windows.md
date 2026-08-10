# QUICKSTART — Windows / PowerShell

Requires **Node.js 18+** and **pnpm** (or use `npx`).

## Install & init

```powershell
npx @cobusgreyling/harness-foundry init --from minimal
npx @cobusgreyling/harness-foundry validate
npx @cobusgreyling/harness-foundry run --goal "list the directory" --turns 4
```

If the `foundry` binary is on your PATH after a local install:

```powershell
npm install -g @cobusgreyling/harness-foundry
foundry init --from minimal
foundry run --goal "list the directory"
```

## Session workflow

```powershell
foundry sessions list
foundry trace show --session <id>
foundry evolve report --session <id>
foundry evolve proposal --session <id>
# After human review:
foundry evolve apply --proposal <id> --yes
```

## From a git clone

```powershell
git clone https://github.com/cobusgreyling/harness-foundry.git
cd harness-foundry
pnpm install
pnpm build
pnpm test
pnpm demo
```

## PowerShell notes

- Paths use backslashes; the runtime accepts either.
- `run_command` uses `cmd.exe /c` on Windows.
- Git worktrees require Git for Windows installed and a real git repo.
- If `pnpm demo` fails because bash is missing, run:

```powershell
node packages/cli/dist/cli.js init --from minimal --name demo
# in a temp dir, or use examples\hello-harness
cd examples\hello-harness
node ..\..\packages\cli\dist\cli.js run --goal "list the directory" --host standalone
```

## Env vars

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | `model/openai` and compatible |
| `OPENAI_COMPAT_API_KEY` | Preferred for `model/openai-compatible` |
| `OPENAI_BASE_URL` | Override base URL for compatible endpoints |
| `ANTHROPIC_API_KEY` | `model/anthropic` |

Without keys, providers run in **simulated** mode (mock tool loop) so CI and first-run still work.
