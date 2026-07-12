import type { ConnectionOptions } from 'bullmq';

import { env } from '../config/env';

/**
 * Redis connection options for BullMQ.
 *
 * We parse `REDIS_URL` into host/port/password and hand BullMQ the options it
 * needs (`maxRetriesPerRequest: null` is required for its blocking worker
 * commands). BullMQ constructs and owns the underlying ioredis client, so we
 * avoid pinning a second copy of ioredis in this package.
 */
function buildConnection(): ConnectionOptions {
  const url = new URL(env.REDIS_URL);
  // A path like `/1` selects Redis logical DB 1. Tests use a separate DB so their
  // queue never collides with a running app/worker on DB 0.
  const dbPath = url.pathname.replace(/^\//, '');
  const db = dbPath ? Number.parseInt(dbPath, 10) : 0;
  return {
    host: url.hostname,
    port: url.port ? Number.parseInt(url.port, 10) : 6379,
    ...(url.password ? { password: url.password } : {}),
    ...(Number.isFinite(db) && db > 0 ? { db } : {}),
    maxRetriesPerRequest: null,
  };
}

export const redisConnection: ConnectionOptions = buildConnection();
