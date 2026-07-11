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
  return {
    host: url.hostname,
    port: url.port ? Number.parseInt(url.port, 10) : 6379,
    ...(url.password ? { password: url.password } : {}),
    maxRetriesPerRequest: null,
  };
}

export const redisConnection: ConnectionOptions = buildConnection();
