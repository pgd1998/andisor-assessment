// Docker seed runner: seeds the catalogue only when it is empty, so container
// restarts never wipe existing data. Compiled to dist/scripts/seed-if-empty.js
// and invoked by docker-entrypoint.sh.
import { prisma } from '../lib/prisma';
import { isCatalogueEmpty, runSeed } from '../lib/seed';

void (async (): Promise<void> => {
  try {
    if (await isCatalogueEmpty()) {
      console.info('[seed] Empty catalogue detected — seeding.');
      await runSeed();
    } else {
      console.info('[seed] Catalogue already populated — skipping.');
    }
  } catch (error) {
    console.error('[seed] Failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
