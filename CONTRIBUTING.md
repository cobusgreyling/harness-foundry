# Contributing

Thanks for helping build harness-foundry.

## Setup

```bash
git clone https://github.com/cobusgreyling/harness-foundry.git
cd harness-foundry
pnpm install && pnpm build
pnpm test
```

Or use the Dev Container (`.devcontainer/`).

## Workflow

1. Pick an issue from [good-first-issues.md](docs/good-first-issues.md)
2. Branch from `main`
3. Add tests for behaviour changes
4. `pnpm build && pnpm test && pnpm lint`
5. Open a PR with a clear description

## Adding a primitive

1. Add YAML under `primitives/`
2. If runtime behaviour is needed, extend `packages/runtime/src/activate.ts` or `packages/interface/`
3. Document in `docs/composition.md`
4. Run `foundry primitives list` after build

## Changesets

User-facing package changes need a changeset:

```bash
pnpm changeset
```