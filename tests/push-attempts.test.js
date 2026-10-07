// push_messages.send_attempts — der Versuchszähler der geplanten Push-Nachrichten.
//
// Der Zähler trägt die Entscheidung, ob eine Nachricht erneut versucht wird.
// Fehlt das Feld auf der Instanz, liest der Cronjob dauerhaft 0, zählt nie
// hoch und läuft jede Minute gegen eine unerreichbare Adresse — ohne dass ein
// Hook-Test deswegen umfällt (der Harness legte das Feld früher von Hand an).
//
// Geprüft wird das Schema, das eine Instanz wirklich bekommt: der
// Sammlungs-Snapshot und die Migrationen danach, gelesen über denselben Weg
// wie der Harness (loadSchema).
//
// Bis 26.09.2026 prüfte diese Datei die 0.22-Migration
// 1782720000_push_send_attempts.js: dass sie additiv ist, kein Feld doppelt
// anlegt und sich zurücknehmen lässt. Diese Tests sind entfallen — die
// Migration liegt als Historie in pocketbase/pb_migrations_022/ und läuft
// auf keiner Instanz mehr. Die Produktion hat sie längst angewendet, neue
// Instanzen starten mit dem Snapshot, in dem das Feld steht.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { loadSchema } = createRequire(import.meta.url)('./harness.js');

// Die Felder aus dem ursprünglichen Schema. Keins davon darf fehlen — der
// Snapshot ersetzt die alten Migrationen, er darf nichts unterwegs verlieren.
const FELDER_ALT = ['title', 'body', 'target_segment', 'target_role', 'scheduled_at', 'sent_at', 'deep_link', 'sent_by'];

describe('push_messages.send_attempts im Schema', () => {
  const felder = loadSchema().push_messages.fields;

  it('ist ein optionales Zahlenfeld ohne negative Werte', () => {
    const f = felder.send_attempts;
    expect(f.type).toBe('number');
    expect(f.required).toBe(false);
    expect(f.min).toBe(0);
  });

  it('steht neben allen bisherigen Feldern', () => {
    for (const name of FELDER_ALT) expect(Object.keys(felder)).toContain(name);
  });
});
