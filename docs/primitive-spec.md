# Primitive specification (v0.5)

A **primitive** is a versioned, declarative unit referenced from `stack.yaml`.

## YAML shape

```yaml
id: control/tool-call-cap
layer: execution   # interface | composition | execution | reliability
description: Hard cap on tool invocations per session
defaults:
  maxToolCalls: 20
```

## Layers

| Layer | Owns |
|-------|------|
| interface | Model providers (`model/*`) |
| composition | Context, tools, MCP |
| execution | Sandbox, budgets, caps |
| reliability | Traces hooks, recovery, evidence |

## Runtime contract

1. Catalogue load merges repo `primitives/`, project `primitives/`, `.foundry/primitives/`.
2. `foundry validate` checks every stack ref exists in the catalogue.
3. Activation runs via `activatePrimitive` or a **plugin handler** registered with `registerPrimitiveHandler`.
4. Side effects must emit `primitive.activate` / `primitive.complete` (built-in path does this).

## Plugin API (TypeScript)

```ts
import { registerPrimitiveHandler } from "@cobusgreyling/harness-foundry-runtime";

registerPrimitiveHandler("tools/my-tool", async (ref, ctx) => ({
  ok: true,
  detail: `config=${JSON.stringify(ref.config ?? {})}`,
  handled: true,
}));
```

## CLI

```bash
foundry primitives list
foundry primitives show control/tool-call-cap
foundry primitives show policy/path-allowlist
```

## Policy primitives (enforced)

| Id | Effect |
|----|--------|
| `sandbox/readonly` | Disables `write_file` and mutating `run_command` |
| `policy/path-allowlist` | File tools only under listed prefixes |
| `policy/command-allowlist` | `run_command` only for listed prefixes |
| `policy/secret-scrub` | Redacts keys/tokens from tool output |
| `control/network-deny` | Expands blocked network tools |
