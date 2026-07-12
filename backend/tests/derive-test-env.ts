/**
 * Derives the test database + Redis targets from the app's own connection URLs,
 * BEFORE anything reads them. This runs as a Vitest `setupFiles` entry.
 *
 * Why derive instead of hardcode: the app's host/port live in `.env` and vary by
 * machine (e.g. a shifted `5433` when the default `5432` is taken). By reusing
 * the app's URL and only swapping the database *name* → `andisor_test` and the
 * Redis logical DB → index 1, the tests always target the same running Postgres
 * and Redis as the stack, whatever ports it uses — with full isolation.
 */
function deriveTestUrls(): void {
  const appDbUrl = process.env.DATABASE_URL;
  if (appDbUrl) {
    const url = new URL(appDbUrl);
    // Path is `/andisor`; swap the database name for the isolated test one.
    url.pathname = '/andisor_test';
    process.env.DATABASE_URL = url.toString();
  }

  const appRedisUrl = process.env.REDIS_URL;
  if (appRedisUrl) {
    const url = new URL(appRedisUrl);
    // Use Redis logical DB 1 so the test queue never collides with the app (DB 0).
    url.pathname = '/1';
    process.env.REDIS_URL = url.toString();
  }

  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
}

deriveTestUrls();
