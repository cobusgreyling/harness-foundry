# Platform roadmap — six pillars to push

**Status:** living plan (2026-07)  
**North star:** a versioned, empirical platform for how production agents are **composed, run, observed, and improved**.

This document turns the six expansion pillars into a **ship sequence**: what we build, in what order, with exit criteria and package ownership. For the version checklist, see [ROADMAP.md](../ROADMAP.md).

```
loop-engineering  →  harness-foundry  →  outerloop
   (patterns)         (runtime + platform)  (governance)
```

---

## Why this order

| # | Pillar | Product claim | Depends on |
|---|--------|---------------|------------|
| **A** | Finish the kernel | Sessions are real production loops | (current v0.4) |
| **4** | Real composition surface | Agents can use real tools/models/hosts | A |
| **1** | npm of harnesses | Stacks/primitives are installable & shareable | A + catalogue depth |
| **3** | Evolve that learns | Harnesses improve from many runs | A + traces + locks |
| **5** | Observability product | Traces are debuggable, not just files | A + richer events |
| **2** | Reliability control plane | Multi-session / fleet behaviour | 4 + outerloop coordination |
| **6** | Harness-bench | Stacks are comparable under fixed suites | 3 + 5 |

**Principle:** catalogue + composition first (things people can *use*), then learning + observability (things that *compound*), then fleet + bench (platform tier).

Do **not** start with hosted SaaS, multi-agent orchestration, or L3 auto-tune. Those need a dense primitive catalogue and trustworthy traces.

---

## Pillar map (what “done” looks like)

### Pillar 1 — The npm of harnesses

**Done when:** a team can publish, install, pin, and upgrade a stack the way they pin npm packages.

```bash
foundry registry login
foundry add stack @acme/security-reviewer@1.2.0
foundry add primitive recovery/narrow-scope@2.0.0
foundry lock            # refresh digests
foundry upgrade --dry-run
```

**Artifacts**

| Artifact | Role |
|----------|------|
| Primitive package (YAML + optional hook) | Smallest install unit |
| Stack package | Curated composition + defaults |
| Registry index | Local (`file:`) then GitHub/npm-backed |
| `stack.lock` digests | Integrity + reproducibility |

**Non-goal:** a separate commercial marketplace before the open registry protocol works offline.

---

### Pillar 2 — Session runner → reliability control plane

**Done when:** multiple Foundry sessions can share policy, detect collisions, and hand off work without ad-hoc scripts.

```bash
foundry fleet init
foundry run --goal "..." --role implementer --register
foundry fleet status
foundry fleet check     # collisions / budget / overlapping paths
```

**Leverage existing work**

- outerloop `coordination` (registry, collision)
- outerloop `policy` / `attention` for routing
- fleet-engineering patterns as **stack roles**, not a new monorepo

**Non-goal:** full distributed orchestration / Kubernetes replacement.

---

### Pillar 3 — Evolve that actually learns

**Done when:** proposals cite **aggregates** across sessions (and optional bench runs), not only single-trace event counts.

```bash
foundry evolve report --session <id>          # L1 (exists)
foundry evolve report --since 7d              # cross-session
foundry evolve proposal --since 7d            # evidence-backed stack diff
foundry evolve apply --proposal <id>          # human gate required
foundry evolve auto --within guardrails.yaml  # L3 (later, opt-in)
```

**Learning ladder**

| Level | Mode | Ship |
|-------|------|------|
| L1 | Report-only | ✅ exists (deepen rules) |
| L2 | Proposal + human apply | v0.4 apply → v0.7 multi-session |
| L3 | Auto-tune within guardrails | v0.8+ opt-in only |

**Non-goal:** unbounded auto-edit of `stack.yaml` without gates.

---

### Pillar 4 — Real composition surface

**Done when:** a stack can wire real models, real MCP servers, policy limits, and a host bridge that is more than a file drop.

| Surface | Target |
|---------|--------|
| Models | Anthropic ✅, mock ✅, OpenAI, Grok/xAI, OpenAI-compatible base URL |
| Tools | Builtins ✅, **MCP stdio** (then SSE) |
| Policy | Allowlist paths/commands, secret scrub, network scope primitives |
| Memory/skills | Primitives that load skill files / memory-engineering adapters |
| Hosts | Cursor, Claude Code, Grok Build — bridge that records host turns into Foundry traces |

---

### Pillar 5 — Observability product

**Done when:** a developer can answer “what happened?” and “which stack is better?” without reading raw JSONL by hand.

```bash
foundry sessions list
foundry trace show --session <id>
foundry trace replay --session <id>
foundry compare --left <sessionA> --right <sessionB>
foundry dashboard          # local TUI or serve (reuse outerloop patterns)
```

**Non-goal (v1):** hosted multi-tenant cloud dashboard. Local-first; optional later sync is outerloop-shaped, not Foundry-core.

---

### Pillar 6 — Harness-bench

**Done when:** stacks are scored on fixed suites so “weaker model + better harness” is measurable.

```bash
foundry bench init --suite smoke
foundry bench run --stack implementer --suite smoke
foundry bench compare --baseline minimal --candidate implementer
foundry evolve report --from-bench <run-id>
```

**Suite kinds (start small)**

1. **smoke** — mock model, wiring, budgets, recovery hooks  
2. **implementer-fixture** — fixed repo fixture + failing test to fix  
3. **tool-use** — MCP + builtins correctness  
4. **(later)** external suite adapters (SWE-lite style) as optional plugins  

---

## Versioned ship plan

### v0.4.x — Finish the kernel (now → 1–2 weeks)

**Goal:** production-credible single-session loop. Close open v0.4 items.

| Work | Package(s) | Exit criteria |
|------|------------|---------------|
| Ship turn-loop work already in tree | `runtime`, `interface`, `core` | CI green; `pnpm demo` shows tool loop |
| OpenAI (+ OpenAI-compatible) adapter | `interface` | `model/openai` primitive; mock parity for tools |
| MCP stdio transport | `mcp`, `runtime` | listTools/callTool against a real server in CI |
| `foundry evolve apply` | `evolve`, `cli` | Requires explicit `--yes` + writes proposal audit; no silent apply |
| Trace completeness | `trace`, `runtime` | Docs list all event types; schema tests cover new types |
| Docs + CHANGELOG | — | QUICKSTART shows tool loop + MCP example |

**Push:** npm `@cobusgreyling/harness-foundry@0.4.x`, demo scripts, GitHub release notes.

---

### v0.5 — Catalogue depth + composition (2–4 weeks)

**Goal:** enough primitives/stacks that Foundry feels like a product, not a sample repo. Pillar **4** bulk + foundation for pillar **1**.

#### Catalogue target

| Layer | Add (examples) | Count target |
|-------|----------------|--------------|
| Interface | `model/openai`, `model/openai-compatible`, `model/grok` | ≥ 5 model primitives |
| Composition | `tools/mcp-stdio`, `tools/search-grep`, `context/agents-md`, `context/skills-dir`, `memory/file-log` | ≥ 10 composition |
| Execution | `control/token-budget-50k`, `control/tool-call-cap-20`, `sandbox/readonly`, `policy/path-allowlist` | ≥ 8 control/sandbox |
| Reliability | `recovery/narrow-scope`, `observability/tool-timeline`, `emit/outerloop-evidence` (harden) | ≥ 8 reliability |

**Stacks (≥ 6 presets)**

| Stack | Persona |
|-------|---------|
| `minimal` | CI smoke (exists) |
| `implementer` | Write + verify (exists) |
| `reviewer` | Read-only review / critique |
| `triage` | LE daily-triage default |
| `ci-sweeper` | LE CI pattern |
| `with-outerloop` | Full governance seam (promote example → stack) |
| `mcp-worker` | MCP-first tool loop |

#### Runtime / CLI

- [ ] Primitive authoring guide: `docs/primitive-spec.md` (schema, layers, activation hooks)
- [ ] `foundry primitives show <id>`
- [ ] Config validation per primitive (zod from YAML `configSchema` optional field)
- [ ] Policy primitives enforced in `tools.ts` / `run_command`
- [ ] Host bridge: record host-invoked turns into session traces (Cursor + Claude Code at least)

**Exit criteria**

- `foundry primitives list` ≥ 25  
- `foundry init --from <name>` works for all presets  
- At least one example uses real MCP (e.g. filesystem server)  
- vs-alternatives + showcase updated  

**Push:** `0.5.0` npm; blog/showcase “compose a harness like a lockfile.”

---

### v0.6 — Registry: the npm of harnesses (3–4 weeks)

**Goal:** Pillar **1**. Installable stacks/primitives with digests.

| Work | Detail |
|------|--------|
| Local registry | `~/.foundry/registry` or project `.foundry/vendor/` |
| Package layout | `foundry-primitive.yaml` / `foundry-stack.yaml` + files |
| CLI | `foundry add`, `foundry remove`, `foundry publish --dry-run`, `foundry search` |
| Remote v1 | Git URL / npm package that re-exports catalogue; later GH packages |
| Lock integrity | Fail `run` if lock digests mismatch and `--frozen-lock` set |
| LE funnel | `loop-init --with-foundry` installs named stack from registry alias |

**Package (new):** `@cobusgreyling/harness-foundry-registry` (or grow `compose`).

**Exit criteria**

- Third-party-style stack installable from git without monorepo clone  
- Lockfile freeze mode in `foundry-gate` CI action  
- Docs: “Publish a stack” tutorial  

**Push:** `0.6.0`; seed 3 public stacks under `@cobusgreyling/*`.

---

### v0.7 — Evolve that learns (3–4 weeks)

**Goal:** Pillar **3** (L2 multi-session). Pillar **5** starts (local inspect).

| Work | Detail |
|------|--------|
| Session index | SQLite or JSON index under `.foundry/sessions/index.json` |
| Aggregators | Error rate, budget exceed rate, recovery rate, verify fail, tool mix |
| Cross-session report | `evolve report --since 7d` / `--stack implementer` |
| Evidence-backed proposals | Each addition cites session IDs + event counts |
| Apply audit trail | Applied proposals written under `.foundry/evolve/applied/` |
| Guardrails schema | Which primitives may auto-change later (prep for L3) |
| Trace UX | `trace replay` (ordered narrative), `sessions inspect` TUI (text-first) |

**Package:** deepen `evolve`; optional `packages/observe` if TUI grows.

**Exit criteria**

- Running 10 mock sessions produces a multi-session report with ≥1 non-trivial finding  
- Proposal cannot apply without human confirmation  
- outerloop emit still optional and unchanged in ownership  

**Push:** `0.7.0`; story: “harness diffs with evidence.”

---

### v0.8 — Control plane + L3 opt-in (4–6 weeks)

**Goal:** Pillar **2** core + cautious L3.

| Work | Detail |
|------|--------|
| Fleet registry | Session register/list/status; path claim sets |
| Collision check | Reuse outerloop coordination concepts; Foundry CLI surface |
| Shared budgets | Project-level token/tool budgets across concurrent sessions |
| Role stacks | `role: implementer \| reviewer \| triage` → stack mapping |
| Handoff primitive | `composition/handoff-manifest` writes artifacts for next role |
| L3 auto-tune | Only inside `guardrails.yaml`; default **off**; audit every change |
| Grok Build host | First-class host adapter alongside Cursor / Claude Code |

**Exit criteria**

- Two parallel sessions cannot claim the same write path without `fleet check` warning  
- L3 demo requires explicit env/flag; CI proves default is off  
- Docs: multi-agent = multiple stacks + coordination, not one mega-agent  

**Push:** `0.8.0`; ecosystem diagram updated (fleet as Foundry mode, not separate product).

---

### v0.9 — Observability product (3–4 weeks)

**Goal:** Pillar **5** local product surface.

| Work | Detail |
|------|--------|
| Snapshot API | Session + trace + evolve summary JSON (mirror outerloop dashboard patterns) |
| TUI | Ink-style or reuse outerloop dashboard patterns for Foundry sessions |
| `foundry compare` | Two sessions or two stacks on same goal fixture |
| Export | OTLP-ish or plain JSON export for external APM (optional adapter) |
| outerloop bridge | “Open evidence in outerloop dashboard” when emit enabled |

**Exit criteria**

- `foundry dashboard` shows last N sessions without reading files manually  
- Compare produces a human-readable reliability delta (budget, verify, recoveries)  

**Push:** `0.9.0`; non-goal remains: hosted SaaS.

---

### v1.0 — Harness-bench + platform GA (4–6 weeks)

**Goal:** Pillar **6** + harden 1–5 into a coherent v1.

| Work | Detail |
|------|--------|
| `foundry bench` | Suite runner, fixtures, result schema |
| Suites | smoke, implementer-fixture, tool-use-mcp |
| Stack scoring | Pass rate, median turns, tokens, recovery count |
| Bench → evolve | `evolve report --from-bench` |
| Stability | Schema version freeze, semver policy for primitives |
| Compatibility matrix | Models × stacks × hosts documented |
| Security review | Sandbox, command allowlist, secret scrub defaults |

**Exit criteria**

- CI runs `foundry bench --suite smoke` on every PR  
- Public scorecard: minimal vs implementer on fixture suite  
- SPEC.md bumped to v1; non-goals reaffirmed  
- npm packages 1.0.0; migration guide from 0.x  

**Push:** `1.0.0` release train; showcase + LE + outerloop coordinated announcements.

---

## Package ownership (who builds what)

| Package | Pillars | Notes |
|---------|---------|-------|
| `core` | all | Schemas, paths, lock, registry types |
| `compose` | 1, 4 | Catalogue, stacks, install resolve |
| `registry` *(new v0.6)* | 1 | add/publish/search |
| `interface` | 4 | Model adapters |
| `mcp` | 4 | Real transport |
| `runtime` | 2, 4, 6 | Turn loop, policy enforce, fleet hooks, bench runner hooks |
| `trace` | 3, 5 | Events, replay helpers |
| `evolve` | 3, 6 | Multi-session, apply, bench reports |
| `emit` | 5 | outerloop seam only |
| `host` | 4, 2 | Host bridges |
| `observe` *(new v0.7–0.9)* | 5 | Dashboard/TUI/compare |
| `cli` | all | Command surface |
| `bench` *(new v1 or under runtime)* | 6 | Suites + scoring |

---

## Push strategy (how we ship, not just build)

### Cadence

| Rhythm | Action |
|--------|--------|
| **Weekly** | One vertical slice mergeable to `main` (primitive set *or* CLI command *or* adapter) |
| **Biweekly** | npm minor/patch when exit criteria for open items are met |
| **Per minor** | Showcase section + example folder + CHANGELOG story |
| **v1** | Coordinated LE pattern aliases + outerloop example refresh |

### Dogfood rule

This repo’s `.foundry/` stack must use every new reliability primitive within one release of adding it. Traces from dogfood feed evolve demos.

### Funnel rule

Every new stack preset gets:

1. LE pattern alias (if applicable)  
2. `foundry init --from <name>`  
3. Showcase snippet  
4. Optional outerloop hook example  

### CI gates (grow over time)

```
v0.4  foundry validate + unit tests + demo smoke
v0.5  + MCP integration smoke
v0.6  + frozen lock gate
v0.7  + multi-session evolve fixture
v0.8  + fleet collision fixture
v0.9  + dashboard snapshot test
v1.0  + foundry bench --suite smoke
```

### Messaging order (external push)

1. **Kernel is real** (tool loop, worktree, verify) — credibility  
2. **Compose & share stacks** (catalogue + registry) — adoption  
3. **Improve from runs** (evolve multi-session) — differentiation  
4. **See what happened** (local observability) — retention  
5. **Measure harnesses** (bench) — thought leadership  
6. **Coordinate many agents** (fleet) — platform narrative  

Do not lead marketing with fleet or L3 auto-tune.

---

## Explicit non-goals (through v1)

| Non-goal | Why |
|----------|-----|
| Replace outerloop | Governance stays separate |
| Hosted multi-tenant dashboard | Local-first; cloud is a later product |
| Auto-apply stack diffs by default | Human gates are the brand |
| Become LangGraph/ADK | Primitives ≠ opinionated graphs |
| Cryptographic primitive marketplace | Digests yes; full sig chain later |
| One mega “do everything” agent | Roles + stacks + handoffs instead |

---

## Immediate next 10 tickets (start here)

Ordered for max learning per week while finishing v0.4:

1. **Land** uncommitted turn-loop + tests + changelog (kernel)  
2. **OpenAI-compatible** model adapter + primitive YAML  
3. **MCP stdio** client (spawn, initialize, tools/list, tools/call)  
4. Wire MCP tools into turn-loop tool list when stack includes `tools/mcp-*`  
5. **`foundry evolve apply`** with `--yes` + audit file  
6. Primitives: `control/tool-call-cap-*`, `sandbox/readonly`, `context/agents-md`  
7. Stacks: `reviewer`, `triage` presets  
8. `docs/primitive-spec.md` + `foundry primitives show`  
9. Session index file (prep for multi-session evolve)  
10. Example: `examples/mcp-filesystem` end-to-end  

---

## Success metrics (v1)

| Metric | Target |
|--------|--------|
| Time to first successful `foundry run` | < 5 minutes from `npx … init` |
| Built-in primitives | ≥ 30 |
| Built-in stacks | ≥ 6 |
| Real model adapters | ≥ 3 |
| MCP | stdio production-usable |
| Evolve | multi-session L2 + gated apply |
| Bench | smoke suite in CI |
| Dogfood | this repo runs Foundry on itself weekly |

---

## Related docs

- [ROADMAP.md](../ROADMAP.md) — version checklist  
- [FOUNDRY.md](../FOUNDRY.md) — L1/L2/L3 cadence  
- [SPEC.md](../SPEC.md) — current contract  
- [architecture.md](./architecture.md) — runtime shape  
- [vs-alternatives.md](./vs-alternatives.md) — positioning  
- [showcase.md](./showcase.md) — demos and stories  
