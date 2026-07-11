import { PrismaClient } from '@prisma/client';

import { isProduction } from '../config/env';

/**
 * Single shared PrismaClient instance.
 *
 * In development the module can be re-evaluated by watchers/HMR, which would
 * otherwise leak connections by creating a new client each reload. Caching the
 * instance on `globalThis` guarantees exactly one client per process.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
