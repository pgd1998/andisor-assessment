import type { Server } from 'node:http';

import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

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

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      void prisma.$disconnect().finally(() => {
        logger.info('Shutdown complete');
        process.exit(0);
      });
    });

    // Force-exit if graceful shutdown stalls.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => shutdown(signal));
  }
}

bootstrap();
