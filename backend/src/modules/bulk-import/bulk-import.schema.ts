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

/**
 * Accepts either a bare array `[...]` or an object `{ products: [...] }` and
 * returns the canonical envelope. Throws a ZodError on anything else.
 */
export function normaliseBulkImportInput(input: unknown): BulkImportPayload {
  const products = Array.isArray(input) ? input : (input as { products?: unknown })?.products;
  return bulkImportPayloadSchema.parse({ products });
}
