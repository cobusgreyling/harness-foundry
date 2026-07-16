# Foundry cadence

## Evolution levels

| Level | Mode | Behaviour |
|-------|------|-----------|
| L1 | Report-only | `foundry evolve report` writes findings; human reviews |
| L2 | Proposal | Stack diffs suggested; human approves apply |
| L3 | Auto-tune | Approved primitives auto-adjust within guardrails |

**v0.2+** ships L1 reports and L2 proposals. L3 auto-tune is not implemented yet.

## Human gates

- No stack auto-apply until `foundry evolve apply` ships (v0.4 roadmap)
- Evidence emission disabled by default (`hooks/outerloop.yaml`)
- High-risk primitive changes require explicit review

## Self-referential use

This repo maintains its own harness under `.foundry/`. Dogfood traces inform evolve reports.