# trace-evolution

Trace-driven harness improvement (L1 → L2).

```bash
foundry init --from minimal
foundry run --goal "Stress test primitives" --turns 2
foundry sessions list
foundry evolve report --session <id>
foundry evolve proposal --session <id>
# Review .foundry/evolve/proposals/<id>.yaml before editing stack.yaml
```