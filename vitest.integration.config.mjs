import { defineConfig } from 'vitest/config';

// Integrationstests gegen ein echtes PocketBase-Binary (tests/integration/).
// Getrennt von `npm test`: Sie brauchen beim ersten Lauf einen Download und
// starten einen Serverprozess. Aufruf: npm run test:integration
export default defineConfig({
  tsconfig: 'tests/tsconfig.json',
  test: {
    include: ['tests/integration/**/*.test.js'],
    environment: 'node',
    globalSetup: ['tests/integration/global-setup.mjs'],
    // Alle Dateien teilen sich EINE Instanz und bauen aufeinander auf
    // (Anmeldung, Check-in, zweiter Check-in). Nebenläufig liefen die
    // Tagesgrenzen der einzelnen Dateien durcheinander.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 15_000,
    hookTimeout: 60_000,
    env: { TZ: 'UTC' },
  },
});
