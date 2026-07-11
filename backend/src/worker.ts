import { Worker } from 'bullmq';

import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { redisConnection } from './lib/redis';
import {
  markBatchesComplete,
  processBulkImportJob,
} from './modules/bulk-import/bulk-import.processor';
import { BULK_IMPORT_QUEUE, type BulkImportJobData } from './modules/bulk-import/bulk-import.types';

/**
 * Standalone BullMQ worker process.
 *
 * Runs separately from the API (own container in Docker) so product-creation
 * load never blocks the HTTP server. Concurrency is bounded to keep DB pressure
 * predictable.
 */
function bootstrap(): void {
  const worker = new Worker<BulkImportJobData>(BULK_IMPORT_QUEUE, processBulkImportJob, {
    connection: redisConnection,
    concurrency: 5,
  });

  worker.on('ready', () => logger.info('Bulk-import worker ready'));
  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'Bulk-import job completed');
  });
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Bulk-import job failed');
  });
  // When the queue empties, settle any batches still marked PROCESSING.
  worker.on('drained', () => {
    void markBatchesComplete();
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — closing worker`);
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => void shutdown(signal));
  }

  logger.info(`Bulk-import worker started (concurrency 5), connected to ${env.REDIS_URL}`);
}

bootstrap();
