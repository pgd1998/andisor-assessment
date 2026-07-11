import pino from 'pino';

import { env, isProduction } from '../config/env';

/**
 * Application-wide structured logger. In development it pretty-prints; in
 * production it emits newline-delimited JSON suitable for log aggregators.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
});
