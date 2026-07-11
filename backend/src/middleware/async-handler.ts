import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * An Express handler that returns a promise. Kept distinct from `RequestHandler`
 * (whose return type is `void`) so the async controllers type-check without
 * tripping `@typescript-eslint/no-misused-promises`.
 */
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wraps an async route handler so any rejected promise is forwarded to Express's
 * error pipeline instead of crashing the process. This removes the need for a
 * try/catch in every controller.
 */
export const asyncHandler =
  (handler: AsyncRequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
