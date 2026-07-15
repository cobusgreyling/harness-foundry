import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const COMPOSE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function bundledCatalogRoot(): string {
  return path.resolve(COMPOSE_ROOT, "catalog");
}

export async function resolveCatalogRoots(projectRoot: string): Promise<string[]> {
  const roots: string[] = [];
  const env = process.env.FOUNDRY_CATALOG_ROOT;
  if (env) roots.push(path.resolve(env));

  const projectCatalog = path.join(projectRoot, "primitives");
  if (await exists(projectCatalog)) roots.push(projectCatalog);

  const foundryCatalog = path.join(projectRoot, ".foundry", "primitives");
  if (await exists(foundryCatalog)) roots.push(foundryCatalog);

  const bundled = bundledCatalogRoot();
  if (await exists(bundled)) roots.push(bundled);

  const repoCatalog = path.resolve(COMPOSE_ROOT, "../../..", "primitives");
  if (await exists(repoCatalog)) roots.push(repoCatalog);

  return [...new Set(roots)];
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}