import { Router } from 'express';

/**
 * Liveness endpoint used by Docker healthchecks and load balancers. Kept free of
 * external dependencies so it reports the *process* is up even if a downstream
 * (DB/Redis) is temporarily unavailable.
 */
export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
