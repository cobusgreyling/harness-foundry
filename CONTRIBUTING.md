# Contributing to harness-foundry

Thank you for helping build the composable harness runtime for agentic engineering.

## Principles

- Primitives are versioned, declarative, and swappable.
- Traces drive evolution — report before you tune.
- Human gates before stack auto-apply.
- Build for production agents, not demo scripts.

## Where to start

1. Read [Contributor start here](https://github.com/cobusgreyling/harness-foundry/discussions/12) and browse [good first issues](docs/good-first-issues.md).
2. Read [ROADMAP.md](./ROADMAP.md) for planned v0.4 work.
3. Run the five-minute loop in [QUICKSTART.md](./QUICKSTART.md).
4. Read [SPEC.md](./SPEC.md) before substantial schema or CLI changes.
5. After your first merged PR, you will be added to [CONTRIBUTORS.md](./CONTRIBUTORS.md) (`pnpm contributors:update`).

## Development setup

```bash
git clone https://github.com/cobusgreyling/harness-foundry.git
cd harness-foundry
pnpm install
pnpm build
pnpm test
pnpm demo
```

**Dev Container:** open the repo in VS Code / GitHub Codespaces — `.devcontainer/` runs install + build on create.

Run the CLI locally:

```bash
pnpm foundry --help
pnpm foundry init --from minimal --project-root /tmp/my-project
pnpm foundry run --goal "Smoke test" --project-root examples/hello-harness
```

## Pull request workflow

### 1. Fork and branch

```bash
git checkout -b feat/short-description   # or fix/, docs/, chore/
```

Use focused branches. One logical change per PR.

### 2. Implement with tests

- TypeScript strict mode, Zod for artifact schemas, Vitest for tests.
- Match patterns in the package you are editing (`packages/<name>/`).
- Run before opening a PR:

```bash
pnpm build
pnpm test
pnpm lint
```

Add tests in `src/*.test.ts` for behavior changes. Examples under `examples/` should keep working.

### 3. Adding a primitive (no TypeScript required)

1. Add YAML under `primitives/<layer>/`
2. If runtime behaviour is needed, extend `packages/runtime/src/activate.ts` or `packages/interface/`
3. Document in `docs/composition.md`
4. Run `foundry primitives list` after build
5. Or file a [primitive request](.github/ISSUE_TEMPLATE/primitive_request.yml) issue first

### 4. Changesets (published packages)

If your PR changes user-facing behavior in any `@cobusgreyling/harness-foundry*` package:

```bash
pnpm changeset
```

Select affected packages and semver bump (`patch` / `minor` / `major`). Commit the generated `.changeset/*.md` file with your PR.

Docs-only or internal test changes do **not** need a changeset.

### 5. Open the PR

- Fill out the [PR template](.github/pull_request_template.md).
- Link the issue: `Fixes #123`.
- Include **rationale** for significant changes.
- Keep PRs small; split large features across stacked PRs when possible.

### 6. Review

Maintainers will review for:

- Correctness and test coverage
- Schema/CLI consistency with SPEC.md
- Changeset presence when needed
- Clear rationale in the PR description

Address feedback with additional commits. Squash-merge is fine.

## Reporting bugs and proposing features

- **Bugs:** [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- **Features:** [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml) — check ROADMAP.md first
- **Primitives:** [primitive request template](.github/ISSUE_TEMPLATE/primitive_request.yml)
- **Security:** see [SECURITY.md](./SECURITY.md) — do not file public issues for vulnerabilities

## Code style

- TypeScript strict mode
- Zod for all artifact schemas
- Vitest for tests
- Small, focused PRs with clear rationale
- No drive-by refactors in the same PR as a feature fix

## Community

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be respectful and constructive.

## Release process (maintainers)

Releases use [Changesets](https://github.com/changesets/changesets). See [docs/PUBLISHING.md](./docs/PUBLISHING.md).