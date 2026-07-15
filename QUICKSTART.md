# Quickstart (5 minutes)

## Clone and demo

```bash
git clone https://github.com/cobusgreyling/harness-foundry.git
cd harness-foundry
pnpm install && pnpm build && pnpm demo
```

## Use in any project

```bash
npx @cobusgreyling/harness-foundry init --from minimal
foundry validate
foundry stack show
foundry run --goal "Verify harness wiring"
foundry sessions list
foundry trace show --session <id>
foundry evolve report --session <id>
foundry evolve proposal --session <id>
```

## Implementer preset

For read-write agent loops with recovery:

```bash
foundry init --from implementer --name my-app
foundry run --goal "Implement feature X"
```

## Enable outerloop evidence

Edit `.foundry/hooks/outerloop.yaml`:

```yaml
enabled: true
adapter: outerloop
emitOn: [session.end]
```

Run a session — evidence is written to `.foundry/sessions/<id>/evidence.json` and, if present, `.outerloop/evidence/`.

## Anthropic model

Use `model/anthropic` in your stack (implementer preset includes it). Set `ANTHROPIC_API_KEY` for live calls; without it, the adapter runs in simulated mode.

## Next

- [docs/concepts.md](docs/concepts.md)
- [docs/cli.md](docs/cli.md)
- [ROADMAP.md](ROADMAP.md)