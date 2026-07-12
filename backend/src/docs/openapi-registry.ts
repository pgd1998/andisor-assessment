import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  bulkImportAcceptedSchema,
  bulkImportStatusSchema,
} from '../modules/bulk-import/bulk-import.schema';
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  productNodeSchema,
  productTreeSchema,
  updateProductSchema,
} from '../modules/products/product.schema';

// Patch Zod so `.openapi()` metadata (and registry registration) is available.
extendZodWithOpenApi(z);

/**
 * Builds the OpenAPI document by registering the SAME Zod schemas that validate
 * requests and shape responses. Because the docs are derived from those schemas,
 * they can never drift from the actual API contract — the single source of truth.
 */
export function buildOpenApiDocument(): ReturnType<OpenApiGeneratorV3['generateDocument']> {
  const registry = new OpenAPIRegistry();

  // Reusable response envelopes: { data: ... } and { error: ... }.
  const dataEnvelope = <T extends z.ZodTypeAny>(inner: T): z.ZodTypeAny =>
    z.object({ data: inner });

  const errorSchema = registry.register(
    'Error',
    z.object({
      error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
      }),
    }),
  );

  const paginatedProducts = z.object({
    data: z.array(productTreeSchema),
    meta: z.object({
      page: z.number().int(),
      pageSize: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  });

  const json = <T extends z.ZodTypeAny>(schema: T): { 'application/json': { schema: T } } => ({
    'application/json': { schema },
  });

  // ── Products ────────────────────────────────────────────────────────────
  registry.registerPath({
    method: 'get',
    path: '/products',
    tags: ['Products'],
    summary: 'List products (paginated)',
    request: { query: listProductsQuerySchema },
    responses: {
      200: { description: 'A page of products', content: json(paginatedProducts) },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/products',
    tags: ['Products'],
    summary: 'Create a product with nested variants',
    request: { body: { content: json(createProductSchema) } },
    responses: {
      201: { description: 'Created', content: json(dataEnvelope(productTreeSchema)) },
      422: { description: 'Validation error', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/products/{id}',
    tags: ['Products'],
    summary: 'Get a single product with its variant subtree',
    request: { params: productIdParamSchema },
    responses: {
      200: { description: 'The product', content: json(dataEnvelope(productTreeSchema)) },
      404: { description: 'Not found', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/products/{id}',
    tags: ['Products'],
    summary: 'Update any attribute of any node (product or variant)',
    request: {
      params: productIdParamSchema,
      body: { content: json(updateProductSchema) },
    },
    responses: {
      200: { description: 'Updated node', content: json(dataEnvelope(productNodeSchema)) },
      404: { description: 'Not found', content: json(errorSchema) },
      422: { description: 'Validation error', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/products/{id}',
    tags: ['Products'],
    summary: 'Delete a node and its subtree',
    request: { params: productIdParamSchema },
    responses: {
      204: { description: 'Deleted' },
      404: { description: 'Not found', content: json(errorSchema) },
    },
  });

  // ── Bulk import ───────────────────────────────────────────────────────────
  registry.registerPath({
    method: 'post',
    path: '/products/bulk-import',
    tags: ['Bulk import'],
    summary: 'Enqueue a batch of products for asynchronous creation',
    description:
      'Accepts a `multipart/form-data` upload with a JSON `file`, or an ' +
      '`application/json` body of `{ products: [...] }`. Returns 202 immediately; ' +
      'creation happens in a background worker.',
    request: {
      body: {
        content: {
          'application/json': { schema: z.object({ products: z.array(createProductSchema) }) },
          'multipart/form-data': {
            schema: z.object({ file: z.string().openapi({ format: 'binary' }) }),
          },
        },
      },
    },
    responses: {
      202: {
        description: 'Accepted for processing',
        content: json(dataEnvelope(bulkImportAcceptedSchema)),
      },
      422: { description: 'Validation error', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/products/bulk-import/{batchId}',
    tags: ['Bulk import'],
    summary: 'Get the status of a bulk-import batch',
    request: { params: z.object({ batchId: z.string() }) },
    responses: {
      200: { description: 'Batch status', content: json(dataEnvelope(bulkImportStatusSchema)) },
      404: { description: 'Not found', content: json(errorSchema) },
    },
  });

  // ── Health ────────────────────────────────────────────────────────────────
  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: 'Liveness probe',
    responses: {
      200: {
        description: 'Service is up',
        content: json(z.object({ status: z.string(), uptime: z.number(), timestamp: z.string() })),
      },
    },
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Andisor Inventory API',
      version: '1.0.0',
      description:
        'CRUD API over a three-level product hierarchy, with asynchronous bulk import via a BullMQ queue. This spec is generated from the same Zod schemas that validate requests.',
    },
    servers: [{ url: '/api', description: 'API root' }],
    tags: [
      { name: 'Products', description: 'Product and variant CRUD' },
      { name: 'Bulk import', description: 'Asynchronous multi-product creation' },
      { name: 'Health', description: 'Service liveness' },
    ],
  });
}
