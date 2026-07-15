# Foundry cadence

## Evolution levels

| Level | Mode | Behaviour |
|-------|------|-----------|
| L1 | Report-only | `foundry evolve report` writes findings; human reviews |
| L2 | Proposal | Stack diffs suggested; human approves apply |
| L3 | Auto-tune | Approved primitives auto-adjust within guardrails |

v0.1 ships **L1 only**.

## Human gates

- No stack auto-apply until L2 checklist complete
- Evidence emission disabled by default (`hooks/outerloop.yaml`)
- High-risk primitive changes require explicit review

## Self-referential use

This repo maintains its own harness under `.foundry/`. Dogfood traces inform evolve reports.