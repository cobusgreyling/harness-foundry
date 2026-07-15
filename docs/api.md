# Programmatic API

## Compose

```ts
import {
  loadStackFromFile,
  resolveStack,
  validateStack,
  loadMergedCatalog,
  stackFromPreset,
  writeStackLock,
} from "@cobusgreyling/harness-foundry-compose";
```

## Runtime

```ts
import { runSession } from "@cobusgreyling/harness-foundry-runtime";

const { manifest, stack } = await runSession({
  projectRoot: process.cwd(),
  goal: "Ship feature",
  turns: 1,
});
```

## Trace

```ts
import { TraceRecorder, readTraceEvents } from "@cobusgreyling/harness-foundry-trace";
```

## Interface

```ts
import { getModelProvider } from "@cobusgreyling/harness-foundry-interface";

const provider = getModelProvider({ primitive: "model/anthropic" });
const result = await provider?.complete({
  goal: "Hello",
  messages: [{ role: "user", content: "Hello" }],
});
```

## Evidence

```ts
import { maybeEmitEvidence } from "@cobusgreyling/harness-foundry-emit";
```

Enable via `.foundry/hooks/outerloop.yaml`. Emits a full `EvidencePackage` compatible with [outerloop](https://github.com/cobusgreyling/outerloop).