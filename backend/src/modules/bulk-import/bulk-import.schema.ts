import { z } from 'zod';

import { sourceProductSchema } from '../products/product.schema';

/**
 * Envelope accepted by the bulk-import endpoint. Whether the products arrive as a
 * raw JSON array or wrapped in `{ products: [...] }`, or via an uploaded file,
 * they are normalised to this shape before validation.
 */
export const bulkImportPayloadSchema = z.object({
  products: z.array(sourceProductSchema).min(1, 'At least one product is required'),
});

export type BulkImportPayload = z.infer<typeof bulkImportPayloadSchema>;

// Response shapes (documentation contract) — mirror the service return types.

/** Body returned when a batch is accepted (202). */
export const bulkImportAcceptedSchema = z.object({
  batchId: z.string(),
  totalProducts: z.number().int(),
  statusUrl: z.string(),
});

/** Body returned when polling a batch's progress. */
export const bulkImportStatusSchema = z.object({
  batchId: z.string(),
  status: z.string(),
  totalProducts: z.number().int(),
  counts: z.object({
    queued: z.number().int(),
    active: z.number().int(),
    completed: z.number().int(),
    failed: z.number().int(),
  }),
});

/**
 * Accepts either a bare array `[...]` or an object `{ products: [...] }` and
 * returns the canonical envelope. Throws a ZodError on anything else.
 */
export function normaliseBulkImportInput(input: unknown): BulkImportPayload {
  const products = Array.isArray(input) ? input : (input as { products?: unknown })?.products;
  return bulkImportPayloadSchema.parse({ products });
}
