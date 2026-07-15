# hello-harness

Minimal example project using harness-foundry.

```bash
cd examples/hello-harness
npx @cobusgreyling/harness-foundry init --name hello-harness
foundry run --goal "Smoke test the harness"
```

After a run, inspect the trace and generate an L1 evolution report:

```bash
foundry trace show --session <id>
foundry evolve report --session <id>
```