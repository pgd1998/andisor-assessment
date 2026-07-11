import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod';

import { toCreateInput } from '../modules/products/product.mapper';
import { sourceProductSchema } from '../modules/products/product.schema';
import { prisma } from './prisma';

/** Default seed-file location, overridable via SEED_FILE (used in Docker). */
function seedFilePath(): string {
  return process.env.SEED_FILE ?? resolve(__dirname, '../../../data/products.json');
}

/** True when the catalogue has no top-level products. */
export async function isCatalogueEmpty(): Promise<boolean> {
  const count = await prisma.product.count({ where: { level: 'PRODUCT' } });
  return count === 0;
}

/**
 * Loads and validates the seed file, then (re)creates the catalogue. Wipes
 * existing products first so the result is deterministic; the self-relation
 * cascade removes variants along with their parent product.
 */
export async function runSeed(): Promise<void> {
  const seedFile = seedFilePath();
  const parsed: unknown = JSON.parse(readFileSync(seedFile, 'utf-8'));

  // Validate against the same schema the API uses, so bad data fails loudly.
  const products = z.array(sourceProductSchema).parse(parsed);
  console.info(`Seeding ${products.length} products from ${seedFile}`);

  await prisma.product.deleteMany({});
  for (const product of products) {
    await prisma.product.create({ data: toCreateInput(product) });
  }

  const [productCount, primaryCount, secondaryCount] = await Promise.all([
    prisma.product.count({ where: { level: 'PRODUCT' } }),
    prisma.product.count({ where: { level: 'PRIMARY_VARIANT' } }),
    prisma.product.count({ where: { level: 'SECONDARY_VARIANT' } }),
  ]);

  console.info(
    `Seed complete: ${productCount} products, ${primaryCount} primary variants, ${secondaryCount} secondary variants`,
  );
}
