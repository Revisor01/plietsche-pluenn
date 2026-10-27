// Harness: Datumsfelder in PB-Form, im Filter als Text verglichen, damit eine T-Grenze wie in Produktion nichts findet.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// CommonJS, weil der Harness die Hooks per vm in eine Goja-Nachbildung lädt.
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
    // 'T' > ' ', am selben Tag verliert der Besuch.
    const rec = visit('2026-09-26T10:00:00.000Z');
    expect(matchesFilter(rec, 'checkin_at >= "2026-09-26T09:00:00.000Z"')).toBe(false);
  });

  it('vergleicht eine Grenze in T-Form an einem anderen Tag trotzdem richtig', () => {
    // An verschiedenen Tagen entscheidet schon das Datum.
    const rec = visit('2026-09-27T10:00:00.000Z');
    expect(matchesFilter(rec, 'checkin_at >= "2026-09-26T09:00:00.000Z"')).toBe(true);
  });

  it('erkennt Gleichstand auf die Millisekunde als erfüllt', () => {
    const rec = visit('2026-09-09T22:00:00.000Z');
    expect(matchesFilter(rec, 'checkin_at >= "2026-09-09 22:00:00.000Z"')).toBe(true);
    expect(matchesFilter(rec, 'checkin_at <= "2026-09-09 22:00:00.000Z"')).toBe(true);
  });

  it('trennt Tage korrekt: gestern Abend zählt nicht zu heute', () => {
    // Besuch gestern 23:00 Ortszeit, Grenze heute 00:00 Ortszeit.
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
