# GitHub Action — Foundry Gate

Validate harness stacks and primitives in CI before merge.

## Reusable workflow

Consumer repos can call the workflow from this repository:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  foundry-gate:
    uses: cobusgreyling/harness-foundry/.github/workflows/foundry-gate.yml@main
    with:
      project-root: .
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `project-root` | `.` | Directory containing `.foundry/stack.yaml` |

## What it checks

On pull requests that touch `.foundry/`, `stacks/`, or `primitives/`:

1. `pnpm install` + `pnpm build`
2. `foundry validate` when `.foundry/stack.yaml` exists

## Pair with outerloop

For governance before merge, add [outerloop evidence-gate](https://github.com/cobusgreyling/outerloop/blob/main/docs/github-action.md) in the same workflow:

```yaml
jobs:
  foundry-gate:
    uses: cobusgreyling/harness-foundry/.github/workflows/foundry-gate.yml@main

  evidence-gate:
    needs: foundry-gate
    uses: cobusgreyling/outerloop/.github/workflows/evidence-gate.yml@main
    with:
      run-id: ${{ github.sha }}
      evidence-source: custom-harness
```

## Local equivalent

```bash
foundry validate
pnpm test
```