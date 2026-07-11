import { BadRequestError, NotFoundError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { getBulkImportQueue } from './bulk-import.queue';
import { normaliseBulkImportInput } from './bulk-import.schema';
import type { BulkImportJobData } from './bulk-import.types';

export interface BulkImportAccepted {
  batchId: string;
  totalProducts: number;
  statusUrl: string;
}

export interface BulkImportStatus {
  batchId: string;
  status: string;
  totalProducts: number;
  counts: { queued: number; active: number; completed: number; failed: number };
}

export const bulkImportService = {
  /**
   * Validates the raw input, records a batch, and enqueues one job per product.
   *
   * Returns as soon as the jobs are queued — it does **not** wait for the
   * products to be created. The heavy lifting happens in the worker.
   */
  async enqueue(rawInput: unknown): Promise<BulkImportAccepted> {
    let payload;
    try {
      payload = normaliseBulkImportInput(rawInput);
    } catch (error) {
      // Surface parse/shape errors as a 400 rather than letting them 500.
      throw new BadRequestError('Invalid bulk-import payload', error);
    }

    const totalProducts = payload.products.length;

    // Record the batch first so a status can be polled immediately.
    const batch = await prisma.importBatch.create({
      data: { totalProducts, status: 'QUEUED' },
    });

    // Enqueue in bulk — one job per product, tagged with the batch id.
    const jobs = payload.products.map((product, index) => ({
      name: 'create-product',
      data: { batchId: batch.id, index: index + 1, product } satisfies BulkImportJobData,
      opts: { jobId: `${batch.id}-${index + 1}` }, // idempotent: dedupes retries
    }));
    await getBulkImportQueue().addBulk(jobs);

    return {
      batchId: batch.id,
      totalProducts,
      statusUrl: `/api/products/bulk-import/${batch.id}`,
    };
  },

  /**
   * Reports progress for a batch by combining the persisted batch record with
   * live job counts pulled from the queue.
   */
  async getStatus(batchId: string): Promise<BulkImportStatus> {
    const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundError(`Import batch "${batchId}" not found`);
    }

    // Note: BullMQ job counts are queue-wide, not scoped to a single batch. With
    // one queue per batch lifetime this is a faithful signal; for a multi-tenant
    // system you would track per-batch progress in the DB instead (see the
    // worker, which updates the batch's status as jobs complete).
    const queue = getBulkImportQueue();
    const [waiting, delayed, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getDelayedCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return {
      batchId: batch.id,
      status: batch.status,
      totalProducts: batch.totalProducts,
      counts: { queued: waiting + delayed, active, completed, failed },
    };
  },
};
