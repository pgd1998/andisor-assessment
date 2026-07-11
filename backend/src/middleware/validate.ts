import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Request segments a schema can validate.
 */
interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Builds middleware that validates and *replaces* the given request segments
 * with their parsed (and coerced) values. Downstream handlers therefore receive
 * fully typed, trusted input. On failure it responds with a 422 and a flat list
 * of field errors.
 */
export const validate =
  (schemas: ValidationSchemas) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const issues: { field: string; message: string }[] = [];

    for (const key of ['body', 'query', 'params'] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (result.success) {
        // Reassign parsed values (coercion, defaults, stripped unknown keys).
        Object.defineProperty(req, key, { value: result.data, writable: true });
      } else {
        for (const issue of result.error.issues) {
          issues.push({
            field: [key, ...issue.path.map(String)].join('.'),
            message: issue.message,
          });
        }
      }
    }

    if (issues.length > 0) {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: issues },
      });
      return;
    }

    next();
  };
