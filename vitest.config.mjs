import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Eigene TS-Einstellung, sonst braucht Vite expo/tsconfig.base, das im Backend-Job fehlt.
  tsconfig: 'tests/tsconfig.json',
  test: {
    include: ['tests/**/*.test.js'],
    // Integration: vitest.integration.config.mjs, npm run test:integration.
    exclude: ['tests/integration/**', '**/node_modules/**'],
    environment: 'node',
    // UTC wie der Container; tests/timezone.test.js stellt beide Zeitzonen gegenüber.
    env: { TZ: 'UTC' },
  },
});
