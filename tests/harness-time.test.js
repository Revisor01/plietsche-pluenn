// Prüft den Harness selbst: Datumsfelder.
//
// PocketBase speichert Datumsfelder in der Form "2026-09-09 22:00:00.000Z"
// (Leerzeichen statt "T") — egal, in welcher Form der Hook sie setzt. Im
// Filter vergleicht SQLite sie als TEXT, nicht als Zeitpunkt.
//
// Früher verglich der Harness als Zeitpunkt und bewahrte die T-Form beim
// Speichern. Das war gutmütiger als PocketBase: Ein Hook, der die Filtergrenze
// in T-Form baut (`toISOString()` ohne `.replace('T', ' ')`), lief im Test
// richtig und fand in Produktion nichts — "T" (0x54) ist größer als das
// Leerzeichen (0x20), am selben Tag liegt jede T-Grenze hinter jedem
// gespeicherten Wert. Gemessen gegen PocketBase 0.22.21: Grenze
// "2026-09-26T09:00:00.000Z" gegen gespeichertes 10:00 → 0 Treffer.
//
// Jetzt bringt der Harness Datumswerte beim Setzen in PB-Form und vergleicht
// als Text. Ein Hook mit T-Grenze fällt im Test durch, wie in Produktion.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// Der Harness ist CommonJS, weil er die Hook-Dateien mit Nodes vm-Modul in
// eine nachgebaute Goja-Umgebung laedt.
const { matchesFilter, FakeRecord } = createRequire(import.meta.url)('./harness.js');

function visit(checkinAt) {
  return new FakeRecord('visits', { user: 'u1', checkin_at: checkinAt });
}

describe('Harness: Datumsfelder werden in PocketBase-Form gespeichert', () => {
  it('macht aus der T-Form die Form mit Leerzeichen', () => {
    expect(visit('2026-09-09T21:59:00.000Z').get('checkin_at')).toBe('2026-09-09 21:59:00.000Z');
  });

  it('lässt die PocketBase-Form unverändert', () => {
    expect(visit('2026-09-09 21:59:00.000Z').get('checkin_at')).toBe('2026-09-09 21:59:00.000Z');
  });

  it('nimmt ein Date-Objekt an', () => {
    expect(visit(new Date('2026-09-09T21:59:00.000Z')).get('checkin_at')).toBe('2026-09-09 21:59:00.000Z');
  });

  it('rechnet eine Zeitzonenangabe nach UTC um', () => {
    expect(visit('2026-09-10T00:30:00+02:00').get('checkin_at')).toBe('2026-09-09 22:30:00.000Z');
  });

  it('lässt ein leeres Datum leer', () => {
    expect(visit('').get('checkin_at')).toBe('');
  });

  it('wirft bei einem Wert, der kein Datum ist', () => {
    // Bewusste Abweichung: PocketBase machte daraus still den Leerwert.
    expect(() => visit('gestern')).toThrow(/visits\.checkin_at ist kein Datum/);
  });
});

describe('Harness: Datumsvergleich im Filter als Text', () => {
  it('findet mit einer Grenze in PB-Form den späteren Besuch', () => {
    const rec = visit('2026-09-26T10:00:00.000Z');
    expect(matchesFilter(rec, 'checkin_at >= "2026-09-26 09:00:00.000Z"')).toBe(true);
  });

  it('findet mit einer Grenze in T-Form nichts — wie PocketBase', () => {
    // Derselbe Besuch, dieselbe Grenze, nur mit "T": 'T' > ' ', der Vergleich
    // geht am selben Tag immer gegen den Besuch aus.
    const rec = visit('2026-09-26T10:00:00.000Z');
    expect(matchesFilter(rec, 'checkin_at >= "2026-09-26T09:00:00.000Z"')).toBe(false);
  });

  it('vergleicht eine Grenze in T-Form an einem anderen Tag trotzdem richtig', () => {
    // Die Falle greift nur am selben Tag — bei verschiedenen Tagen entscheidet
    // schon der Datumsteil. Genau deshalb fällt sie in Stichproben selten auf.
    const rec = visit('2026-09-27T10:00:00.000Z');
    expect(matchesFilter(rec, 'checkin_at >= "2026-09-26T09:00:00.000Z"')).toBe(true);
  });

  it('erkennt Gleichstand auf die Millisekunde als erfüllt', () => {
    const rec = visit('2026-09-09T22:00:00.000Z');
    expect(matchesFilter(rec, 'checkin_at >= "2026-09-09 22:00:00.000Z"')).toBe(true);
    expect(matchesFilter(rec, 'checkin_at <= "2026-09-09 22:00:00.000Z"')).toBe(true);
  });

  it('trennt Tage korrekt: gestern Abend zählt nicht zu heute', () => {
    // Der Fall aus hasVisitToday(): Besuch gestern 23:00 Ortszeit (= 21:00 UTC),
    // Tagesgrenze heute 00:00 Ortszeit (= gestern 22:00 UTC).
    const gesternAbend = visit('2026-09-09T21:00:00.000Z');
    expect(matchesFilter(gesternAbend, 'checkin_at >= "2026-09-09 22:00:00.000Z"')).toBe(false);
  });

  it('zählt einen Besuch nach Mitternacht Ortszeit zu heute', () => {
    const heuteFrueh = visit('2026-09-09T22:30:00.000Z');
    expect(matchesFilter(heuteFrueh, 'checkin_at >= "2026-09-09 22:00:00.000Z"')).toBe(true);
  });

  it('vergleicht ein leeres Datum als Leerstring', () => {
    // Der Filter aus dem Push-Cronjob: `sent_at = ""` für noch nicht Versandtes.
    const offen = new FakeRecord('push_messages', { title: 't', body: 'b' });
    const raus = new FakeRecord('push_messages', { title: 't', body: 'b', sent_at: '2026-09-09T22:00:00.000Z' });
    expect(matchesFilter(offen, 'sent_at = ""')).toBe(true);
    expect(matchesFilter(raus, 'sent_at = ""')).toBe(false);
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
