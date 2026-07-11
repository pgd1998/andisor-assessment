import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env, isTest } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { openApiDocument } from './docs/openapi';
import { bulkImportRouter } from './modules/bulk-import/bulk-import.router';
import { healthRouter } from './modules/health/health.router';
import { productRouter } from './modules/products/product.router';

/**
 * Builds the Express application. Exported as a factory (rather than a bootstrapped
 * server) so tests can import the app and exercise it with supertest in-process,
 * without binding a port.
 */
export function createApp(): Express {
  const app = express();

  // ── Security & platform middleware ────────────────────────────────────────
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Structured request logging (silenced during tests to keep output clean).
  if (!isTest) {
    app.use(pinoHttp({ logger }));
  }

  // Global rate limiter to protect against abuse.
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // ── Documentation ─────────────────────────────────────────────────────────
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/health', healthRouter);
  // Bulk-import routes are mounted before the generic `/:id` routes so that
  // `/products/bulk-import` is not captured as an id.
  app.use('/api/products', bulkImportRouter);
  app.use('/api/products', productRouter);

  // ── Fallbacks ─────────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
