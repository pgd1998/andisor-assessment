import type { SourceProduct } from '../products/product.schema';

/** Name of the BullMQ queue that carries product-creation jobs. */
export const BULK_IMPORT_QUEUE = 'bulk-import';

/**
 * Payload of a single bulk-import job. One job creates exactly one product (with
 * its full variant tree), so a failure isolates to that product rather than the
 * whole batch, and BullMQ can retry it independently.
 */
export interface BulkImportJobData {
  batchId: string;
  /** 1-based index of this product within its batch, for logging/traceability. */
  index: number;
  product: SourceProduct;
}
