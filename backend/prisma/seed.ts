import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

import { toCreateInput } from '../src/modules/products/product.mapper';
import { sourceProductSchema } from '../src/modules/products/product.schema';

const prisma = new PrismaClient();

// Resolve the seed file relative to the repo's `data/` folder. Overridable so the
// same script works in Docker (where the file is copied to a known path).
const SEED_FILE = process.env.SEED_FILE ?? resolve(__dirname, '../../data/products.json');

async function main(): Promise<void> {
  const raw = readFileSync(SEED_FILE, 'utf-8');
  const parsed: unknown = JSON.parse(raw);

  // The dataset is validated against the same schema the API uses, so bad seed
  // data fails loudly here instead of producing a corrupt catalogue.
  const products = z.array(sourceProductSchema).parse(parsed);

  console.info(`Seeding ${products.length} products from ${SEED_FILE}`);

  // Idempotent: wipe the catalogue first so re-running yields a clean state.
  // The self-relation cascade removes variants with their parent product.
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

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
