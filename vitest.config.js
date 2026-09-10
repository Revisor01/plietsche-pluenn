import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    // Die Tagesgrenze in hasVisitToday() wird aus der lokalen Zeitzone
    // abgeleitet. Ohne feste Zeitzone wandert sie mit der Umgebung, und
    // Tests würden je nach Rechner unterschiedlich ausfallen.
    env: { TZ: 'Europe/Berlin' },
  },
});
