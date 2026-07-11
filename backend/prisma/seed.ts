// Local seed entrypoint, run via `npm run db:seed` (tsx). It always reseeds.
// The Docker entrypoint uses the same `runSeed()` but only when the catalogue
// is empty — see backend/docker-entrypoint.sh.
import { prisma } from '../src/lib/prisma';
import { runSeed } from '../src/lib/seed';

void (async (): Promise<void> => {
  try {
    await runSeed();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
