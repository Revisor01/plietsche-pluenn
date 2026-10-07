import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Eigene TypeScript-Einstellung fuer die Tests. Ohne sie greift Vite beim
  // Uebersetzen von mobile/lib/*.ts auf mobile/tsconfig.json zurueck, und die
  // erbt von expo/tsconfig.base — das liegt nur vor, wenn die App-Abhaengig-
  // keiten installiert sind. Im CI-Job fuer das Backend sind sie das nicht.
  tsconfig: 'tests/tsconfig.json',
  test: {
    include: ['tests/**/*.test.js'],
    // Die Tests gegen das echte Binary haben eine eigene Konfiguration
    // (vitest.integration.config.mjs, npm run test:integration).
    exclude: ['tests/integration/**', '**/node_modules/**'],
    environment: 'node',
    // Die Suite läuft in UTC — so, wie der Container in Produktion läuft.
    //
    // Vorher stand hier Europe/Berlin. Die Begründung (ohne feste Zeitzone
    // wandern die Ergebnisse mit dem Rechner) war richtig, die Wahl nicht: Es
    // war genau die Zeitzone, die der Server NICHT hat. Die Suite prüfte damit
    // gegen eine Umgebung, die es in Produktion nirgends gibt, und konnte den
    // Versatz an der Tagesgrenze deshalb nicht finden.
    //
    // Die Fachlogik leitet Tagesgrenze, Woche und Jahr inzwischen aus der
    // gepflegten Ladenzeitzone ab und nicht mehr aus der des Prozesses. UTC
    // ist damit die ehrlichere Vorgabe: Läuft ein Test nur hier grün, weil der
    // Rechner zufällig deutsche Zeit hat, fällt das sofort auf.
    // tests/timezone.test.js stellt zusätzlich beide Fälle gegenüber.
    env: { TZ: 'UTC' },
  },
});
