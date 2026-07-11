import { Queue } from 'bullmq';

import { redisConnection } from '../../lib/redis';
import { BULK_IMPORT_QUEUE, type BulkImportJobData } from './bulk-import.types';

/**
 * Producer-side queue handle. Lazily instantiated so importing this module (e.g.
 * in tests) does not eagerly open a Redis connection.
 */
let queue: Queue<BulkImportJobData> | undefined;

export function getBulkImportQueue(): Queue<BulkImportJobData> {
  if (!queue) {
    queue = new Queue<BulkImportJobData>(BULK_IMPORT_QUEUE, {
      connection: redisConnection,
      defaultJobOptions: {
        // Retry transient failures with exponential backoff.
        attempts: 3,
        backoff: { type: 'exponential', delay: 1_000 },
        // Keep the queue tidy: drop succeeded jobs, retain recent failures.
        removeOnComplete: { age: 3_600, count: 1_000 },
        removeOnFail: { age: 24 * 3_600 },
      },
    });
  }
  return queue;
}

/** Closes the queue connection (used on graceful shutdown and in tests). */
export async function closeBulkImportQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = undefined;
  }
}
