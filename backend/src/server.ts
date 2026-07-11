import type { Server } from 'node:http';

import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { closeBulkImportQueue } from './modules/bulk-import/bulk-import.queue';

/**
 * HTTP entrypoint. Boots the Express app and installs graceful-shutdown handlers
 * so in-flight requests drain and the DB pool closes cleanly on SIGTERM/SIGINT.
 */
function bootstrap(): void {
  const app = createApp();
  const server: Server = app.listen(env.API_PORT, () => {
    logger.info(`API listening on http://localhost:${env.API_PORT} (${env.NODE_ENV})`);
    logger.info(`API docs available at http://localhost:${env.API_PORT}/docs`);
  });

  const closeServer = async (): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  };

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);

    // Force-exit if graceful shutdown stalls.
    const forceExit = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    await closeServer();
    await Promise.allSettled([closeBulkImportQueue(), prisma.$disconnect()]);
    logger.info('Shutdown complete');
    process.exit(0);
  };

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => void shutdown(signal));
  }
}

bootstrap();
