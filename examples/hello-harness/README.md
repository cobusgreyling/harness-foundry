# hello-harness

Runnable minimal example — **no API keys required**.

## From monorepo root

```bash
pnpm build
cd examples/hello-harness
node ../../packages/cli/dist/cli.js validate
node ../../packages/cli/dist/cli.js run --goal "list the directory" --turns 4 --host standalone
```

Inspect the latest session:

```bash
node ../../packages/cli/dist/cli.js sessions list
node ../../packages/cli/dist/cli.js evolve report --session <id>
```

## From published CLI

```bash
npx @cobusgreyling/harness-foundry init --from minimal --name hello
foundry run --goal "list the directory"
```
