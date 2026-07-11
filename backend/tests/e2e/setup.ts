import { execSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach } from 'vitest';

import { prisma } from '../../src/lib/prisma';

/**
 * e2e test harness.
 *
 * Ensures the (separate) test database schema exists, then truncates all tables
 * before every test so each case starts from a known-empty state. The suite runs
 * with `fileParallelism: false` (see vitest.config.ts) so truncation is safe.
 */
beforeAll(() => {
  // Push the Prisma schema to the test database. `db push` is idempotent and
  // fast — ideal for tests where migration history is irrelevant.
  execSync('prisma db push --skip-generate --accept-data-loss', {
    stdio: 'ignore',
    env: process.env,
  });
});

beforeEach(async () => {
  // Order matters only without cascade; TRUNCATE ... CASCADE handles the tree.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "products", "import_batches" RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
