import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    // Runs before any test module: derives the isolated test DB/Redis targets
    // from the app's own connection URLs (see tests/derive-test-env.ts).
    setupFiles: ['./tests/derive-test-env.ts'],
    // e2e tests talk to a real database; run files sequentially to avoid
    // cross-test interference on shared tables.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/server.ts', 'src/worker.ts', 'src/docs/**'],
    },
  },
});
