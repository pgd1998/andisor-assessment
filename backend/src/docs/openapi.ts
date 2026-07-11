/**
 * Hand-authored OpenAPI 3.0 document served at `/docs`. Kept intentionally
 * lightweight (no build-time generation) while still giving reviewers an
 * interactive, accurate contract for every endpoint.
 */
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };

function jsonContent(schemaName: string): Record<string, unknown> {
  return { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } };
}

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Andisor Inventory API',
    version: '1.0.0',
    description:
      'CRUD API over a three-level product hierarchy, with asynchronous bulk import via a BullMQ queue.',
  },
  servers: [{ url: '/api', description: 'API root' }],
  tags: [
    { name: 'Products', description: 'Product and variant CRUD' },
    { name: 'Bulk import', description: 'Asynchronous multi-product creation' },
    { name: 'Health', description: 'Service liveness' },
  ],
  paths: {
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products (paginated)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', default: 5, minimum: 1, maximum: 100 },
          },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'A page of products', content: jsonContent('PaginatedProducts') },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create a product with nested variants',
        requestBody: { required: true, content: jsonContent('SourceProduct') },
        responses: {
          '201': { description: 'Created', content: jsonContent('ProductTreeResponse') },
          '422': { description: 'Validation error', content: jsonContent('Error') },
        },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get a single product with its variant subtree',
        parameters: [idParam],
        responses: {
          '200': { description: 'The product', content: jsonContent('ProductTreeResponse') },
          '404': { description: 'Not found', content: jsonContent('Error') },
        },
      },
      patch: {
        tags: ['Products'],
        summary: 'Update any attribute of any node (product or variant)',
        parameters: [idParam],
        requestBody: { required: true, content: jsonContent('UpdateProduct') },
        responses: {
          '200': { description: 'Updated node', content: jsonContent('ProductResponse') },
          '404': { description: 'Not found', content: jsonContent('Error') },
          '422': { description: 'Validation error', content: jsonContent('Error') },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete a node and its subtree',
        parameters: [idParam],
        responses: {
          '204': { description: 'Deleted' },
          '404': { description: 'Not found', content: jsonContent('Error') },
        },
      },
    },
    '/products/bulk-import': {
      post: {
        tags: ['Bulk import'],
        summary: 'Enqueue a batch of products for asynchronous creation',
        description:
          'Accepts either a `multipart/form-data` upload with a JSON `file`, or an ' +
          '`application/json` body of `{ products: [...] }`. Returns 202 immediately ' +
          'with a batch id; creation happens in a background worker.',
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BulkImportBody' } },
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Accepted for processing',
            content: jsonContent('BulkImportAccepted'),
          },
          '422': { description: 'Validation error', content: jsonContent('Error') },
        },
      },
    },
    '/products/bulk-import/{batchId}': {
      get: {
        tags: ['Bulk import'],
        summary: 'Get the status of a bulk-import batch',
        parameters: [{ name: 'batchId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Batch status', content: jsonContent('BulkImportStatus') },
          '404': { description: 'Not found', content: jsonContent('Error') },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        responses: { '200': { description: 'Service is up', content: jsonContent('Health') } },
      },
    },
  },
  components: {
    schemas: {
      Node: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          level: { type: 'string', enum: ['PRODUCT', 'PRIMARY_VARIANT', 'SECONDARY_VARIANT'] },
          parentId: { type: 'string', nullable: true },
          name: { type: 'string' },
          price: { type: 'number' },
          discountPercentage: { type: 'integer' },
          inventory: { type: 'integer' },
          active: { type: 'boolean' },
          description: { type: 'string', nullable: true },
          category: { type: 'string', nullable: true },
          image: { type: 'string', nullable: true },
          leadTime: { type: 'string', nullable: true },
        },
      },
      SourceProduct: {
        type: 'object',
        required: ['title', 'price'],
        properties: {
          title: { type: 'string' },
          price: { type: 'number' },
          discountPercentage: { type: 'integer' },
          inventory: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
          active: { type: 'boolean' },
          leadTime: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          image: { type: 'string' },
          primary_variant_name: { type: 'string' },
          secondary_variant_name: { type: 'string' },
          primary_variants: { type: 'array', items: { type: 'object' } },
        },
      },
      UpdateProduct: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          discountPercentage: { type: 'integer', minimum: 0, maximum: 100 },
          inventory: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
          active: { type: 'boolean' },
        },
      },
      BulkImportBody: {
        type: 'object',
        required: ['products'],
        properties: {
          products: { type: 'array', items: { $ref: '#/components/schemas/SourceProduct' } },
        },
      },
      PaginatedProducts: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Node' } },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              pageSize: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
              hasNextPage: { type: 'boolean' },
              hasPreviousPage: { type: 'boolean' },
            },
          },
        },
      },
      ProductTreeResponse: {
        type: 'object',
        properties: { data: { $ref: '#/components/schemas/Node' } },
      },
      ProductResponse: {
        type: 'object',
        properties: { data: { $ref: '#/components/schemas/Node' } },
      },
      BulkImportAccepted: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              batchId: { type: 'string' },
              totalProducts: { type: 'integer' },
              statusUrl: { type: 'string' },
            },
          },
        },
      },
      BulkImportStatus: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              batchId: { type: 'string' },
              status: { type: 'string' },
              totalProducts: { type: 'integer' },
              counts: {
                type: 'object',
                properties: {
                  queued: { type: 'integer' },
                  active: { type: 'integer' },
                  completed: { type: 'integer' },
                  failed: { type: 'integer' },
                },
              },
            },
          },
        },
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          uptime: { type: 'number' },
          timestamp: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
    },
  },
};
