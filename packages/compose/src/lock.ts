import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  StackLockSchema,
  stackLockPath,
  type HarnessStack,
  type LayerName,
  type PrimitiveDefinition,
  type StackLock,
} from "@cobusgreyling/harness-foundry-core";
import { resolveStack } from "./load.js";

export function primitiveDigest(
  primitiveId: string,
  definition?: PrimitiveDefinition,
): string {
  const payload = JSON.stringify({
    id: primitiveId,
    defaults: definition?.defaults ?? {},
    version: definition?.layer ?? "unknown",
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function buildStackLock(
  stack: HarnessStack,
  catalog: Map<string, PrimitiveDefinition>,
): StackLock {
  const resolved = resolveStack(stack);
  const layerByPrimitive = new Map<string, LayerName>();
  for (const [layer, refs] of Object.entries(resolved.byLayer)) {
    for (const ref of refs) {
      layerByPrimitive.set(ref.primitive, layer as LayerName);
    }
  }

  return StackLockSchema.parse({
    stackName: stack.name,
    stackVersion: stack.version,
    lockedAt: new Date().toISOString(),
    entries: resolved.primitives.map((ref) => ({
      primitive: ref.primitive,
      digest: primitiveDigest(ref.primitive, catalog.get(ref.primitive)),
      layer: layerByPrimitive.get(ref.primitive) ?? "composition",
      resolvedAt: new Date().toISOString(),
    })),
  });
}

export async function writeStackLock(
  projectRoot: string,
  stack: HarnessStack,
  catalog: Map<string, PrimitiveDefinition>,
): Promise<string> {
  const lock = buildStackLock(stack, catalog);
  const file = stackLockPath(projectRoot);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  return file;
}