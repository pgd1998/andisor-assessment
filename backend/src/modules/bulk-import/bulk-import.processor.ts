import type { Job } from 'bullmq';

import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { productService } from '../products/product.service';
import type { BulkImportJobData } from './bulk-import.types';

/**
 * Processes a single bulk-import job: creates one product (with its variant tree)
 * and advances the batch's per-job progress.
 *
 * The batch is marked COMPLETED deterministically once `processedCount +
 * failedCount === totalProducts` — driven by this batch's own jobs, not by a
 * queue-wide `drained` event (which is unreliable with a long-lived worker).
 */
export async function processBulkImportJob(job: Job<BulkImportJobData>): Promise<void> {
  const { batchId, index, product } = job.data;

  // Mark the batch as processing on the first job we see for it.
  await prisma.importBatch.updateMany({
    where: { id: batchId, status: 'QUEUED' },
    data: { status: 'PROCESSING' },
  });

  try {
    await productService.create(product);
    logger.info({ batchId, index, title: product.title }, 'Bulk-import product created');
    await recordJobResult(batchId, 'success');
  } catch (error) {
    // Record the failure and settle the batch, then rethrow so BullMQ applies its
    // retry policy. (On the final attempt this leaves the batch settled.)
    await recordJobResult(batchId, 'failure');
    throw error;
  }
}

/**
 * Atomically increments the batch's processed/failed counters, then flips it to
 * COMPLETED (or FAILED) once every job in the batch has finished.
 */
async function recordJobResult(batchId: string, result: 'success' | 'failure'): Promise<void> {
  const batch = await prisma.importBatch.update({
    where: { id: batchId },
    data:
      result === 'success'
        ? { processedCount: { increment: 1 } }
        : { failedCount: { increment: 1 } },
  });

  if (batch.processedCount + batch.failedCount >= batch.totalProducts) {
    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: batch.failedCount > 0 && batch.processedCount === 0 ? 'FAILED' : 'COMPLETED',
      },
    });
  }
}
