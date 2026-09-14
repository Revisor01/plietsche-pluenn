// Prüft den Harness selbst: Sortierung und Blätterung.
//
// Warum es diese Tests gibt: Der Harness steht zwischen den Hooks und den
// Erwartungen der Tests. Weicht er von PocketBase ab, prüft die ganze Suite
// etwas anderes als das, was im Laden passiert — und zwar unbemerkt, denn ein
// gutmütiger Harness macht Tests grün, nicht rot.
//
// Zwei solche Abweichungen sind hier festgenagelt:
//
//   1. `offset` wurde still verschluckt. Alle Aufrufe in den Hooks übergeben
//      ihn; wer eine Blätterung einbaut, bekäme im Test die erste Seite und in
//      Produktion die zweite.
//   2. Absteigend wurde durch Umdrehen der aufsteigenden Liste erzeugt. Bei
//      gleichen Sortierwerten kehrt das die Reihenfolge um — PocketBase tut
//      das nicht. Betroffen ist findActiveCampaign: Bei zwei Aktionen mit
//      demselben Faktor gilt die erste, nicht die letzte.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { loadHook } = createRequire(import.meta.url)('./harness.js');

// Irgendein Hook, der den DAO aufspannt — geprüft wird hier nur der DAO selbst.
function dao(rows) {
  return loadHook('push.pb.js', { users: [], push_devices: [], probe: rows }).dao;
}

describe('Harness: Blätterung (offset)', () => {
  it('überspringt die ersten Datensätze, statt den Parameter zu ignorieren', () => {
    const d = dao([
      { id: 'p1', n: 1 },
      { id: 'p2', n: 2 },
      { id: 'p3', n: 3 },
      { id: 'p4', n: 4 },
    ]);
    // Zweite Seite à zwei Einträgen: PocketBase liefert p3 und p4.
    const seite2 = d.findRecordsByFilter('probe', 'n > 0', 'n', 2, 2);
    expect(seite2.map((r) => r.id)).toEqual(['p3', 'p4']);
  });

  it('liefert ohne offset weiterhin die erste Seite', () => {
    const d = dao([
      { id: 'p1', n: 1 },
      { id: 'p2', n: 2 },
      { id: 'p3', n: 3 },
    ]);
    expect(d.findRecordsByFilter('probe', 'n > 0', 'n', 2, 0).map((r) => r.id))
      .toEqual(['p1', 'p2']);
  });

  it('gibt hinter dem Ende eine leere Liste zurück', () => {
    const d = dao([{ id: 'p1', n: 1 }]);
    expect(d.findRecordsByFilter('probe', 'n > 0', 'n', 10, 5)).toEqual([]);
  });

  it('blättert auch ohne Obergrenze: der Rest ab dem offset', () => {
    // Die Hooks rufen fast durchgehend mit limit 0 auf („alles").
    const d = dao([
      { id: 'p1', n: 1 },
      { id: 'p2', n: 2 },
      { id: 'p3', n: 3 },
    ]);
    expect(d.findRecordsByFilter('probe', 'n > 0', 'n', 0, 1).map((r) => r.id))
      .toEqual(['p2', 'p3']);
  });

  it('scheitert bei einem unsinnigen offset, statt still die erste Seite zu liefern', () => {
    const d = dao([{ id: 'p1', n: 1 }]);
    expect(() => d.findRecordsByFilter('probe', 'n > 0', 'n', 0, -1)).toThrow(/offset/);
    expect(() => d.findRecordsByFilter('probe', 'n > 0', 'n', 0, 1.5)).toThrow(/offset/);
  });
});

describe('Harness: absteigende Sortierung', () => {
  it('lässt bei Gleichstand die Eingabereihenfolge stehen', () => {
    // Der Fall aus findActiveCampaign (sortiert nach "-multiplier"): zwei
    // Aktionen mit demselben Faktor. PocketBase nimmt die erste — mit
    // `.reverse()` nahm der Harness die letzte und prüfte damit eine andere
    // Aktion, als im Laden gilt.
    const d = dao([
      { id: 'a', multiplier: 2 },
      { id: 'b', multiplier: 2 },
      { id: 'c', multiplier: 2 },
    ]);
    expect(d.findRecordsByFilter('probe', '1=1', '-multiplier', 0, 0).map((r) => r.id))
      .toEqual(['a', 'b', 'c']);
  });

  it('sortiert verschiedene Werte weiterhin absteigend', () => {
    const d = dao([
      { id: 'klein', multiplier: 1 },
      { id: 'gross', multiplier: 3 },
      { id: 'mittel', multiplier: 2 },
    ]);
    expect(d.findRecordsByFilter('probe', '1=1', '-multiplier', 0, 0).map((r) => r.id))
      .toEqual(['gross', 'mittel', 'klein']);
  });

  it('hält Gleichstände auch zwischen verschiedenen Werten stabil', () => {
    const d = dao([
      { id: 'a3', multiplier: 3 },
      { id: 'b2', multiplier: 2 },
      { id: 'c3', multiplier: 3 },
      { id: 'd2', multiplier: 2 },
    ]);
    expect(d.findRecordsByFilter('probe', '1=1', '-multiplier', 0, 0).map((r) => r.id))
      .toEqual(['a3', 'c3', 'b2', 'd2']);
  });

  it('sortiert aufsteigend unverändert', () => {
    const d = dao([
      { id: 'gross', multiplier: 3 },
      { id: 'klein', multiplier: 1 },
      { id: 'mittel', multiplier: 2 },
    ]);
    expect(d.findRecordsByFilter('probe', '1=1', 'multiplier', 0, 0).map((r) => r.id))
      .toEqual(['klein', 'mittel', 'gross']);
  });
});

describe('Harness: Sortierung wirkt auf die Auswahl der Aktion', () => {
  it('wählt bei gleichem Faktor die erste Aktion, wie PocketBase', () => {
    // Die Wirkung der Härtung dort, wo sie zählt: findActiveCampaign nimmt die
    // erste Zeile der nach "-multiplier" sortierten Liste.
    const jetzt = new Date('2026-06-15T12:00:00.000Z');
    const h = loadHook('scan.pb.js', {
      users: [{ __name: 'u', id: 'u1', role: 'visitor' }],
      campaigns: [
        { id: 'erste', name: 'Erste', starts_at: '2026-06-01 00:00:00.000Z', ends_at: '2026-06-30 00:00:00.000Z', multiplier: 2 },
        { id: 'zweite', name: 'Zweite', starts_at: '2026-06-01 00:00:00.000Z', ends_at: '2026-06-30 00:00:00.000Z', multiplier: 2 },
      ],
      store: [{ pts_checkin: 10 }],
      visits: [],
      items: [],
      points_log: [],
      badges: [],
      user_badges: [],
      action_counts: [],
    });
    const c = h.lib.findActiveCampaign(jetzt, h.records.u);
    expect(c && c.id).toBe('erste');
  });
});

describe('Harness: Nullwerte der Feldtypen', () => {
  // Dieselbe Falle wie bei den Zahlenfeldern, eine Ebene weiter: PocketBase
  // liefert für ein nicht gesetztes Feld den Nullwert seines TYPS. Gibt der
  // Harness stattdessen überall den Leerstring, prüft ein Test etwas anderes
  // als die Produktion — und zwar unauffällig, weil nichts scheitert.
  const h = loadHook('scan.pb.js', {
    store: [{ pts_checkin: 10 }],
    users: [],
    items: [],
    visits: [],
    points_log: [],
    badges: [],
    user_badges: [],
    campaigns: [],
    action_counts: [],
  });

  it('liefert fuer ein nicht gesetztes Zahlenfeld 0', () => {
    const r = h.newRecord('items', { title: 'Jacke' });
    expect(r.get('points')).toBe(0);
  });

  it('liefert fuer ein nicht gesetztes Wahrheitsfeld false', () => {
    const r = h.newRecord('items', { title: 'Jacke' });
    expect(r.get('is_showcase')).toBe(false);
    expect(r.get('stays_external')).toBe(false);
    expect(r.get('brought_awarded')).toBe(false);
  });

  it('liefert fuer ein nicht gesetztes Textfeld den Leerstring', () => {
    const r = h.newRecord('items', { title: 'Jacke' });
    expect(r.get('size')).toBe('');
    expect(r.get('status')).toBe('');
  });

  it('gibt einen gesetzten Wert unveraendert zurueck', () => {
    // Die Gegenprobe: Der Nullwert greift nur, wenn nichts gesetzt ist.
    const r = h.newRecord('items', { points: 30, is_showcase: true, size: 'M' });
    expect(r.get('points')).toBe(30);
    expect(r.get('is_showcase')).toBe(true);
    expect(r.get('size')).toBe('M');
  });

  it('gibt ein ausdruecklich auf false gesetztes Wahrheitsfeld als false zurueck', () => {
    const r = h.newRecord('items', { is_showcase: false });
    expect(r.get('is_showcase')).toBe(false);
  });
});
