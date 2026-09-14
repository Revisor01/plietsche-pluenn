// Prüft den Harness selbst: Zeitstempel-Vergleiche.
//
// Warum es diese Tests gibt: Die Hooks speichern Zeitstempel mit
// `toISOString()` (Trenner "T"), bauen Filtergrenzen aber mit
// `.replace('T', ' ')` (Trenner Leerzeichen) — so, wie PocketBase Datumsfelder
// schreibt. Vergleicht man diese beiden Formen als Zeichenketten, gewinnt der
// gespeicherte Wert immer, sobald der Datumsteil gleich ist: "T" ist 0x54,
// das Leerzeichen 0x20.
//
// Folge: Ein Test an der Tagesgrenze wäre rot, obwohl die Produktion richtig
// rechnet — PocketBase vergleicht Datumsfelder als Datum, nicht als Text. Wer
// so einen Test sieht, weicht im Zweifel die Erwartung auf und verdeckt damit
// einen echten Fehler. Deshalb wird der Harness hier festgenagelt.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// Der Harness ist CommonJS, weil er die Hook-Dateien mit Nodes vm-Modul in
// eine nachgebaute Goja-Umgebung laedt.
const { matchesFilter, FakeRecord } = createRequire(import.meta.url)('./harness.js');

function visit(checkinAt) {
  return new FakeRecord('visits', { user: 'u1', checkin_at: checkinAt });
}

describe('Harness: Zeitstempel-Vergleich', () => {
  it('vergleicht über die Trennerformen hinweg als Zeitpunkt, nicht als Text', () => {
    // Gespeichert mit "T", Grenze mit Leerzeichen — dieselbe Sekunde.
    const rec = visit('2026-09-09T21:59:00.000Z');
    expect(matchesFilter(rec, 'checkin_at >= "2026-09-09 22:00:00.000Z"')).toBe(false);
  });

  it('erkennt einen Wert nach der Grenze', () => {
    const rec = visit('2026-09-09T22:00:01.000Z');
    expect(matchesFilter(rec, 'checkin_at >= "2026-09-09 22:00:00.000Z"')).toBe(true);
  });

  it('erkennt Gleichstand auf die Millisekunde als erfüllt', () => {
    const rec = visit('2026-09-09T22:00:00.000Z');
    expect(matchesFilter(rec, 'checkin_at >= "2026-09-09 22:00:00.000Z"')).toBe(true);
  });

  it('vergleicht <= ebenfalls als Zeitpunkt', () => {
    const rec = visit('2026-09-09T22:00:01.000Z');
    expect(matchesFilter(rec, 'checkin_at <= "2026-09-09 22:00:00.000Z"')).toBe(false);
  });

  it('trennt Tage korrekt: gestern Abend zählt nicht zu heute', () => {
    // Der Fall aus hasVisitToday(): Besuch gestern 23:00 Ortszeit (= 21:00 UTC),
    // Tagesgrenze heute 00:00 Ortszeit (= gestern 22:00 UTC).
    const gesternAbend = visit('2026-09-09T21:00:00.000Z');
    const heuteGrenze = '2026-09-09 22:00:00.000Z';
    expect(matchesFilter(gesternAbend, `checkin_at >= "${heuteGrenze}"`)).toBe(false);
  });

  it('zählt einen Besuch nach Mitternacht Ortszeit zu heute', () => {
    const heuteFrueh = visit('2026-09-09T22:30:00.000Z');
    const heuteGrenze = '2026-09-09 22:00:00.000Z';
    expect(matchesFilter(heuteFrueh, `checkin_at >= "${heuteGrenze}"`)).toBe(true);
  });

  it('vergleicht reine Zahlenfelder weiterhin numerisch', () => {
    const rec = new FakeRecord('items', { points: 5 });
    expect(matchesFilter(rec, 'points > 3')).toBe(true);
    expect(matchesFilter(rec, 'points > 7')).toBe(false);
  });

  it('vergleicht Zeichenketten ohne Datumsform weiterhin als Text', () => {
    const rec = new FakeRecord('items', { status: 'pending' });
    expect(matchesFilter(rec, 'status = "pending"')).toBe(true);
    expect(matchesFilter(rec, 'status != "approved"')).toBe(true);
  });
});
