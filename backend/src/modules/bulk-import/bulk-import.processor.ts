import type { Job } from 'bullmq';

import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { productService } from '../products/product.service';
import type { BulkImportJobData } from './bulk-import.types';

/**
 * Processes a single bulk-import job: creates one product (with its variant tree)
 * and advances the batch's status. Throwing here lets BullMQ apply the queue's
 * retry/backoff policy; after the final attempt the job lands in the failed set.
 */
export async function processBulkImportJob(job: Job<BulkImportJobData>): Promise<void> {
  const { batchId, index, product } = job.data;

  // Mark the batch as processing on the first job we see for it.
  await prisma.importBatch.updateMany({
    where: { id: batchId, status: 'QUEUED' },
    data: { status: 'PROCESSING' },
  });

  await productService.create(product);
  logger.info({ batchId, index, title: product.title }, 'Bulk-import product created');
}

/**
 * Marks a batch COMPLETED once its queue has fully drained. Wired to the worker's
 * `drained` event so status settles without polling.
 */
export async function markBatchesComplete(): Promise<void> {
  await prisma.importBatch.updateMany({
    where: { status: 'PROCESSING' },
    data: { status: 'COMPLETED' },
  });
}
