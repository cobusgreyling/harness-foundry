# harness-foundry Roadmap

## v0.1 ✅

- [x] Four-layer taxonomy and primitive catalogue
- [x] `foundry init`, `run`, `stack show`, `trace show`
- [x] L1 evolve reports
- [x] Monorepo + CI

## v0.2 ✅

- [x] `model/anthropic` and `model/mock` adapters
- [x] `implementer` stack preset
- [x] `foundry validate`, `primitives list`, `sessions list`
- [x] `primitive.activate` / `primitive.complete` trace events
- [x] `stack.lock` primitive digests
- [x] outerloop `EvidencePackage` emission
- [x] L2 evolve proposals
- [x] Recovery primitives
- [x] MCP stub package
- [x] npm publish pipeline + smoke test
- [x] Docs, CONTRIBUTING, issue templates

## v0.3 ✅

- [x] Implementer execution: git worktrees, test verification, recovery
- [x] Cursor / Claude Code host adapters (`foundry host integrate`)
- [x] GitHub Action: reusable foundry-gate workflow
- [x] npm publish (`@cobusgreyling/harness-foundry`)

## v0.4 (next)

- [ ] OpenAI model adapter
- [ ] Real MCP stdio transport
- [ ] `foundry evolve apply` (behind human gate)

## Non-goals (v1)

- Replacing outerloop governance
- Auto-applying stack diffs without human review
- Hosted trace dashboard