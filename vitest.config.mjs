import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
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
