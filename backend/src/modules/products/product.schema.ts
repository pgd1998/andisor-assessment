import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Source / seed shape
//
// The seed file (`data/products.json`) and the bulk-import payload share this
// nested shape. `inventory` is intentionally lenient (the source types it as a
// string on products but a number on variants) and normalised to an integer.
// ─────────────────────────────────────────────────────────────────────────────

const looseInventory = z.union([z.number(), z.string()]).transform((value) => {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
});

const priceSchema = z.number().nonnegative();
const discountSchema = z.number().int().min(0).max(100).default(0);

export const secondaryVariantInputSchema = z.object({
  name: z.string().min(1),
  price: priceSchema,
  discountPercentage: discountSchema,
  inventory: looseInventory,
});

export const primaryVariantInputSchema = z.object({
  name: z.string().min(1),
  price: priceSchema,
  discountPercentage: discountSchema,
  inventory: looseInventory,
  active: z.boolean().default(true),
  secondary_variants: z.array(secondaryVariantInputSchema).default([]),
});

/**
 * Canonical shape of a product as it appears in the seed file / bulk import.
 * `id` from the source is ignored on import (the DB assigns its own cuid).
 */
export const sourceProductSchema = z.object({
  title: z.string().min(1),
  price: priceSchema,
  discountPercentage: discountSchema,
  inventory: looseInventory,
  active: z.boolean().default(true),
  leadTime: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  image: z.string().url().optional(),
  primary_variant_name: z.string().optional(),
  secondary_variant_name: z.string().optional(),
  primary_variants: z.array(primaryVariantInputSchema).default([]),
});

export type SourceProduct = z.infer<typeof sourceProductSchema>;
export type PrimaryVariantInput = z.infer<typeof primaryVariantInputSchema>;
export type SecondaryVariantInput = z.infer<typeof secondaryVariantInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// API DTOs
// ─────────────────────────────────────────────────────────────────────────────

/** Body for `POST /api/products`. Accepts a full nested product. */
export const createProductSchema = sourceProductSchema;
export type CreateProductDto = z.infer<typeof createProductSchema>;

/**
 * Body for `PATCH /api/products/:id`. Every commercial attribute is editable at
 * any level; at least one field must be present. Uses the DB field names since
 * a PATCH targets a single node (product *or* variant) directly.
 */
export const updateProductSchema = z
  .object({
    name: z.string().min(1),
    price: priceSchema,
    discountPercentage: z.number().int().min(0).max(100),
    inventory: looseInventory,
    active: z.boolean(),
    description: z.string().nullable(),
    category: z.string().nullable(),
    image: z.string().url().nullable(),
    leadTime: z.string().nullable(),
    primaryVariantName: z.string().nullable(),
    secondaryVariantName: z.string().nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateProductDto = z.infer<typeof updateProductSchema>;

/** Query params for `GET /api/products`. */
export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(5),
  search: z.string().trim().min(1).optional(),
  // Ordering by creation time. `newest` surfaces freshly bulk-imported products
  // at the top of page 1; the default preserves the original catalogue order.
  sort: z.enum(['oldest', 'newest']).default('oldest'),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

/** Path param for id-based routes. */
export const productIdParamSchema = z.object({
  id: z.string().min(1),
});
