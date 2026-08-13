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
import { resolveCatalogRoots } from "./catalog.js";

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

export async function loadPrimitiveCatalogFromRoot(
  catalogRoot: string,
): Promise<Map<string, PrimitiveDefinition>> {
  const catalog = new Map<string, PrimitiveDefinition>();
  const layerDirs = await listCatalogLayerDirs(catalogRoot);

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

async function listCatalogLayerDirs(catalogRoot: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(catalogRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name !== "node_modules")
      .map((entry) => entry.name)
      .sort();
  } catch {
    return ["context", "tools", "control", "observability", "interface", "recovery"];
  }
}

export async function loadMergedCatalog(
  projectRoot: string,
): Promise<Map<string, PrimitiveDefinition>> {
  const merged = new Map<string, PrimitiveDefinition>();
  const roots = await resolveCatalogRoots(projectRoot);
  for (const root of roots) {
    const partial = await loadPrimitiveCatalogFromRoot(root);
    for (const [id, def] of partial) merged.set(id, def);
  }
  return merged;
}

/** @deprecated use loadMergedCatalog */
export const loadPrimitiveCatalog = loadPrimitiveCatalogFromRoot;

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
      errors.push(`Primitive not in catalog: ${ref.primitive}`);
    }
  }

  if (stack.layers.interface.length === 0) {
    warnings.push("No interface-layer primitives (model provider).");
  }
  if (stack.layers.reliability.length === 0) {
    warnings.push("No reliability-layer primitives (tracing/recovery).");
  }

  const hasRecovery = resolved.primitives.some((p) => p.primitive.startsWith("recovery/"));
  const hasWriteTools = resolved.primitives.some((p) => p.primitive.includes("write"));
  if (hasWriteTools && !hasRecovery) {
    warnings.push("Write tools without recovery primitive — consider recovery/revert-on-test-fail");
  }

  return { valid: errors.length === 0, errors, warnings };
}