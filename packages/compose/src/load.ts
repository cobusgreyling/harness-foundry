import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import {
  HarnessStackSchema,
  PrimitiveDefinitionSchema,
  type HarnessStack,
  type LayerName,
  type PrimitiveDefinition,
  type PrimitiveRef,
} from "@cobusgreyling/harness-foundry-core";

export async function loadStackFromFile(filePath: string): Promise<HarnessStack> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = YAML.parse(raw);
  return HarnessStackSchema.parse(parsed);
}

export async function saveStackToFile(stack: HarnessStack, filePath: string): Promise<void> {
  const validated = HarnessStackSchema.parse(stack);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, YAML.stringify(validated), "utf8");
}

export async function loadPrimitiveCatalog(
  catalogRoot: string,
): Promise<Map<string, PrimitiveDefinition>> {
  const catalog = new Map<string, PrimitiveDefinition>();
  const layerDirs = ["context", "tools", "control", "observability", "interface"];

  for (const layerDir of layerDirs) {
    const dir = path.join(catalogRoot, layerDir);
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.endsWith(".yaml") && !entry.endsWith(".yml")) continue;
      const filePath = path.join(dir, entry);
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = PrimitiveDefinitionSchema.parse(YAML.parse(raw));
      catalog.set(parsed.id, parsed);
    }
  }

  return catalog;
}

export type ResolvedStack = {
  stack: HarnessStack;
  primitives: PrimitiveRef[];
  byLayer: Record<LayerName, PrimitiveRef[]>;
};

export function resolveStack(stack: HarnessStack): ResolvedStack {
  const byLayer: Record<LayerName, PrimitiveRef[]> = {
    interface: [...stack.layers.interface],
    composition: [...stack.layers.composition],
    execution: [...stack.layers.execution],
    reliability: [...stack.layers.reliability],
  };

  return {
    stack,
    primitives: [
      ...byLayer.interface,
      ...byLayer.composition,
      ...byLayer.execution,
      ...byLayer.reliability,
    ],
    byLayer,
  };
}

export type StackValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function validateStack(
  stack: HarnessStack,
  catalog?: Map<string, PrimitiveDefinition>,
): StackValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const resolved = resolveStack(stack);

  if (resolved.primitives.length === 0) {
    errors.push("Stack has no primitives configured.");
  }

  const seen = new Set<string>();
  for (const ref of resolved.primitives) {
    if (seen.has(ref.primitive)) {
      warnings.push(`Duplicate primitive: ${ref.primitive}`);
    }
    seen.add(ref.primitive);

    if (catalog && !catalog.has(ref.primitive)) {
      warnings.push(`Primitive not in catalog: ${ref.primitive}`);
    }
  }

  if (stack.layers.interface.length === 0) {
    warnings.push("No interface-layer primitives (model provider).");
  }
  if (stack.layers.reliability.length === 0) {
    warnings.push("No reliability-layer primitives (tracing/recovery).");
  }

  return { valid: errors.length === 0, errors, warnings };
}