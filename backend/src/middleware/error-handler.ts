import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/**
 * Terminal error-handling middleware. Every thrown/rejected error funnels here
 * and is mapped to a consistent JSON shape. Order matters: most specific first.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express requires the 4-arg signature.
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    respond(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    respond(res, 422, 'VALIDATION_ERROR', 'Request validation failed', err.issues);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2025: record required for the operation was not found.
    if (err.code === 'P2025') {
      respond(res, 404, 'NOT_FOUND', 'The requested resource was not found');
      return;
    }
    // P2002: unique constraint violation.
    if (err.code === 'P2002') {
      respond(res, 409, 'CONFLICT', 'A resource with these values already exists');
      return;
    }
  }

  logger.error({ err }, 'Unhandled error');
  respond(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
}

function respond(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const body: ErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  res.status(statusCode).json(body);
}

/**
 * Catch-all for unmatched routes — produces the same error envelope as everything else.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
}
