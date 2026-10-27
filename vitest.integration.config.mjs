import { defineConfig } from 'vitest/config';

// Integrationstests gegen ein echtes PocketBase-Binary. Aufruf: npm run test:integration
export default defineConfig({
  tsconfig: 'tests/tsconfig.json',
  test: {
    include: ['tests/integration/**/*.test.js'],
    environment: 'node',
    globalSetup: ['tests/integration/global-setup.mjs'],
    // Eine gemeinsame Instanz, nebenläufig liefen die Tagesgrenzen durcheinander.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 15_000,
    hookTimeout: 60_000,
    env: { TZ: 'UTC' },
  },
});
