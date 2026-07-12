import { buildOpenApiDocument } from './openapi-registry';

/**
 * OpenAPI 3.0 document served at `/docs`, generated at startup from the same Zod
 * schemas that validate requests and shape responses — so the docs can never
 * drift from the actual API contract.
 */
export const openApiDocument = buildOpenApiDocument();
