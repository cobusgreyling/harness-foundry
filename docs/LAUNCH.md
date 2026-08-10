# Launch kit — harness-foundry

Ready-to-post copy for Show HN, X, and LinkedIn.

**Official launch discussion (Q&A hub):**  
https://github.com/cobusgreyling/harness-foundry/discussions/16
  
Repo: https://github.com/cobusgreyling/harness-foundry  
npm: `npx @cobusgreyling/harness-foundry init --from minimal`

**Social preview image (for GitHub Settings):**  
[`docs/social-preview.png`](./social-preview.png) · 1280×640 · also at  
`~/Downloads/harness-foundry-social-preview.png` after local prep.

Set once: **Repo → Settings → Social preview → Edit → Upload image**

---

## Show HN (Hacker News)

### Title (pick one)

1. **Show HN: Versioned agent harnesses with traces and human-gated evolution** (recommended)
2. Show HN: Package.json for AI agents — compose, run, trace, evolve
3. Show HN: The missing runtime layer between model SDKs and production agents

### Body

```
Hi HN —

I built harness-foundry because every production agent I touched had the same failure mode: the "harness" lived as host-specific prompt mush (Cursor rules, Claude Code config, ad-hoc scripts). When something broke, there was no shared vocabulary, no session trace, and no path from run → tune → govern.

harness-foundry is a composable runtime for that layer:

  Model → Primitives → Runtime → Trace → Evidence
         (compose)     (session)  (jsonl)  (outerloop)

What you get:

• Declarative stacks (stack.yaml) built from versioned primitives
  (model adapters, sandboxes, token budgets, recovery, observability)
• foundry run — executes a session, writes a lockfile + JSONL trace
• foundry evolve report/proposal — L1 diagnose / L2 stack diff from
  real runs (human gate before apply; no silent auto-tune)
• Host adapters for Cursor and Claude Code (same stack, same traces)
• Optional seam into outerloop for evidence → verdict → answerability
• CI reusable workflow to validate stacks in PRs

Try it:

  npx @cobusgreyling/harness-foundry init --from minimal
  foundry validate
  foundry run --goal "Verify harness wiring"
  foundry trace show --session <id>
  foundry evolve report --session <id>

It sits between design patterns and governance:

  loop-engineering → harness-foundry → outerloop
     (patterns)         (runtime)       (governance)

Not another LangGraph. Not another model SDK. Primitive-first harness
engineering: version the harness, trace the runs, evolve with eyes open.

Repo: https://github.com/cobusgreyling/harness-foundry
Showcase: https://github.com/cobusgreyling/harness-foundry/blob/main/docs/showcase.md
vs alternatives: https://github.com/cobusgreyling/harness-foundry/blob/main/docs/vs-alternatives.md

Happy to answer questions about the four-layer taxonomy, why traces
drive evolution, or how this differs from graph orchestration.
```

### Show HN tips

- Post Tue–Thu, ~9–11am US time when possible.
- First comment: paste a short terminal transcript from `pnpm demo` / `foundry run`.
- Stay in the thread; answer honestly about v0.4 gaps (OpenAI adapter, full MCP, evolve apply).

---

## X / Twitter thread

### Post 1 (hook)

```
Your agent works in Cursor until it doesn't —
and you can't version, replay, or govern the harness.

That's the gap.

harness-foundry = composable runtime for production agents

Model → Primitives → Runtime → Trace → Evidence

github.com/cobusgreyling/harness-foundry
```

### Post 2 (problem)

```
Most teams ship:

• monolithic prompts
• host-specific configs
• no session traces
• "just tweak the system prompt" as the only evolution path

When it fails, there's no shared vocabulary and no empirical loop.
```

### Post 3 (what it is)

```
harness-foundry makes harness engineering:

✓ declarative (stack.yaml + primitives)
✓ versioned (stack.lock digests)
✓ empirical (JSONL traces every session)
✓ evolvable (L1 report → L2 proposal, human gate)

npx @cobusgreyling/harness-foundry init --from minimal
```

### Post 4 (stack)

```
Four layers:

L1 Interface   — model providers
L2 Composition — tools, context, catalogue
L3 Execution   — turn loop, sandbox, control
L4 Reliability — traces, recovery, evidence emit

Swap primitives. Keep the session contract.
```

### Post 5 (ecosystem)

```
The full stack:

loop-engineering  →  harness-foundry  →  outerloop
   (patterns)           (runtime)         (governance)

Design the loop. Execute the harness. Govern the outcome.
```

### Post 6 (CTA)

```
If you build agents for real work:

→ Star / try: github.com/cobusgreyling/harness-foundry
→ Showcase: demos, stacks, Cursor + Claude Code hosts
→ Propose a primitive without touching TS (issue template)

What would you put in your first stack.yaml?
```

---

## LinkedIn post

```
Most production AI agents still run on "harness mush":
host-specific prompts, no session traces, and no way to
evolve the setup from real runs.

I open-sourced harness-foundry — a composable runtime layer
for production agents.

Think package.json for agent harnesses:

• Compose versioned primitives into a stack.yaml
• Run sessions (standalone, Cursor, or Claude Code)
• Get JSONL traces for every primitive activation
• Evolve the stack from evidence — with human gates
• Emit into outerloop for verdict / answerability

Model → Primitives → Runtime → Trace → Evidence

60-second start:

npx @cobusgreyling/harness-foundry init --from minimal
foundry run --goal "Verify harness wiring"

It sits between design patterns and governance:

loop-engineering → harness-foundry → outerloop

If you care about agents that are versioned, traceable,
and governable — not just clever demos — take a look:

https://github.com/cobusgreyling/harness-foundry

#AIAgents #LLM #OpenSource #DeveloperTools #AgenticEngineering
```

---

## First-comment terminal paste (use under Show HN or HN top comment)

```
$ npx @cobusgreyling/harness-foundry init --from minimal
$ foundry validate
Stack is valid.
$ foundry run --goal "Verify harness wiring"
Session complete
  Host: standalone
  Status: completed
  Trace: .foundry/sessions/<id>/trace.jsonl
$ foundry evolve report --session <id>
# L1 findings from the real run — human reviews before any stack change
```

---

## Checklist before posting

- [ ] Social preview image set in GitHub Settings (this file's image)
- [ ] `npx` path works on a clean machine
- [ ] README header loads (hard-refresh if cached)
- [ ] Showcase + QUICKSTART links work
- [ ] Be ready for: "vs LangGraph?", "OpenAI support?", "why not just prompts?"
- [ ] Honest roadmap: OpenAI adapter, MCP stdio, `evolve apply` (v0.4)

## One-line answers for common questions

| Question | Answer |
|----------|--------|
| vs LangGraph? | Graph orchestration vs primitive-first harness engineering + traces + evolution |
| vs Cursor rules? | Host-portable, versioned stacks; same traces across Cursor / Claude Code / CI |
| Why not just prompts? | Prompts aren't locked, composed, traced, or evolved as a unit |
| Is this a framework? | Runtime + CLI for harness composition; bring your model / host |
| Governance? | Optional outerloop seam: evidence → verdict → answerability |
