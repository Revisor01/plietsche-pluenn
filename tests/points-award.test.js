// Tests für awardPoints und recomputeTotal — die beiden Funktionen, durch die
// jeder einzelne Punkt der App läuft.
//
// Bisher waren sie nur mittelbar geprüft: über Check-in, Scan und Abzeichen.
// Das deckt das Zusammenspiel ab, aber nicht die Zusagen, die diese beiden
// Funktionen selbst geben — und die stehen als Begründung im Code:
//
//   „Recomputing — instead of incrementing in memory — keeps points_total
//    self-healing: it can never drift from points_log, even across multiple
//    awardPoints() calls in one request or a stale user object."
//
// Genau diese drei Zusagen werden hier direkt geprüft: die Selbstheilung aus
// dem Verlauf, mehrere Vergaben in einem Durchgang und ein veraltetes
// Nutzerobjekt. Ein Fehler darin wäre für Nutzer:innen unmittelbar sichtbar —
// der Punktestand ist die Zahl, auf die die ganze App zeigt.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { loadHook } = createRequire(import.meta.url)('./harness.js');

// scan.pb.js dient nur als Träger; benutzt wird das lib-Objekt.
function setup(store = {}) {
  return loadHook('scan.pb.js', {
    store: [{ __name: 'store', pts_checkin: 10, pts_take: 5 }],
    users: store.users || [{ __name: 'user', id: 'u1', points_total: 0 }],
    points_log: store.points_log || [],
    visits: [],
    badges: [],
    user_badges: [],
    campaigns: [],
    action_counts: [],
    items: [],
  });
}

describe('awardPoints — einen Eintrag schreiben', () => {
  it('schreibt genau eine Zeile mit allen Angaben', () => {
    const h = setup();
    h.lib.awardPoints(h.records.user, 25, 'scan', 'Jacke, M', null);

    const log = h.rows('points_log');
    expect(log).toHaveLength(1);
    expect(log[0].user).toBe('u1');
    expect(log[0].points).toBe(25);
    expect(log[0].kind).toBe('scan');
    expect(log[0].label).toBe('Jacke, M');
  });

  it('vermerkt den Bezug, wenn einer mitgegeben wird', () => {
    // Abzeichen-Punkte tragen die Abzeichen-Id, damit der Verlauf zeigt,
    // wofür sie kamen.
    const h = setup();
    h.lib.awardPoints(h.records.user, 50, 'badge', 'Stammgast — bronze', 'badge1');
    expect(h.rows('points_log')[0].ref_id).toBe('badge1');
  });

  it('laesst ref_id weg, wenn keiner mitgegeben wird', () => {
    // Ein Scan-Eintrag darf keinen Verweis auf das Teil tragen — das ist die
    // Datenschutz-Zusage der Route: Teile bekommen einen Zeitstempel, aber
    // keinen Verweis auf die Person, und umgekehrt.
    const h = setup();
    h.lib.awardPoints(h.records.user, 30, 'scan', 'Jacke', null);
    expect(h.rows('points_log')[0].ref_id).toBeUndefined();
  });

  it('schreibt einen leeren Text, wenn keine Bezeichnung kommt', () => {
    const h = setup();
    h.lib.awardPoints(h.records.user, 10, 'checkin', null, null);
    expect(h.rows('points_log')[0].label).toBe('');
  });

  it('setzt den Punktestand nach jeder Vergabe neu', () => {
    const h = setup();
    h.lib.awardPoints(h.records.user, 10, 'checkin', 'Check-In im Laden', null);
    expect(h.records.user.get('points_total')).toBe(10);
  });

  it('zaehlt mehrere Vergaben in einem Durchgang zusammen', () => {
    // Der Fall aus dem Check-in: Besuchsbonus und Stepper-Punkte laufen
    // nacheinander durch dieselbe Funktion, auf demselben Nutzerobjekt.
    const h = setup();
    h.lib.awardPoints(h.records.user, 10, 'checkin', 'Check-In im Laden', null);
    h.lib.awardPoints(h.records.user, 15, 'checkin', '3 Teile mitgenommen', null);

    expect(h.rows('points_log')).toHaveLength(2);
    expect(h.records.user.get('points_total')).toBe(25);
  });

  it('verrechnet einen Abzug', () => {
    // Eine Korrektur des Teams kann negativ sein; der Stand ist die Summe,
    // nicht die Zahl der Zeilen.
    const h = setup({ points_log: [{ id: 'p1', user: 'u1', points: 100, kind: 'checkin' }] });
    h.lib.awardPoints(h.records.user, -30, 'korrektur', 'Rueckbuchung', null);
    expect(h.records.user.get('points_total')).toBe(70);
  });
});

describe('recomputeTotal — der Stand ist die Summe des Verlaufs', () => {
  it('rechnet den Stand aus dem vorhandenen Verlauf', () => {
    const h = setup({
      points_log: [
        { id: 'p1', user: 'u1', points: 10, kind: 'checkin' },
        { id: 'p2', user: 'u1', points: 30, kind: 'scan' },
        { id: 'p3', user: 'u1', points: 50, kind: 'badge' },
      ],
    });
    h.lib.recomputeTotal(h.records.user);
    expect(h.records.user.get('points_total')).toBe(90);
  });

  it('heilt einen abgedrifteten Stand', () => {
    // Die im Code genannte Zusage: points_total kann nicht dauerhaft vom
    // Verlauf abweichen. Hier steht ein falscher Wert im Feld — nach dem
    // Neurechnen stimmt er wieder.
    const h = setup({
      users: [{ __name: 'user', id: 'u1', points_total: 9999 }],
      points_log: [
        { id: 'p1', user: 'u1', points: 10, kind: 'checkin' },
        { id: 'p2', user: 'u1', points: 30, kind: 'scan' },
      ],
    });
    h.lib.recomputeTotal(h.records.user);
    expect(h.records.user.get('points_total')).toBe(40);
  });

  it('zaehlt nur den Verlauf der eigenen Person', () => {
    const h = setup({
      users: [
        { __name: 'user', id: 'u1', points_total: 0 },
        { __name: 'other', id: 'u2', points_total: 0 },
      ],
      points_log: [
        { id: 'p1', user: 'u1', points: 10, kind: 'checkin' },
        { id: 'p2', user: 'u2', points: 500, kind: 'badge' },
        { id: 'p3', user: 'u1', points: 30, kind: 'scan' },
      ],
    });
    h.lib.recomputeTotal(h.records.user);
    expect(h.records.user.get('points_total')).toBe(40);
    // Die andere Person bleibt unberuehrt, bis sie selbst gerechnet wird.
    expect(h.records.other.get('points_total')).toBe(0);
    h.lib.recomputeTotal(h.records.other);
    expect(h.records.other.get('points_total')).toBe(500);
  });

  it('setzt einen Stand ohne Verlauf auf null', () => {
    // Auch das ist Selbstheilung: Wer keinen Verlauf hat, hat keine Punkte.
    // Ein stehengebliebener Wert aus der App darf nicht ueberleben.
    const h = setup({ users: [{ __name: 'user', id: 'u1', points_total: 1234 }] });
    h.lib.recomputeTotal(h.records.user);
    expect(h.records.user.get('points_total')).toBe(0);
  });

  it('rechnet auf einem veralteten Nutzerobjekt richtig', () => {
    // Der dritte im Code genannte Fall: Das uebergebene Objekt traegt einen
    // alten Stand, weil zwischenzeitlich anderswo Punkte kamen. Gerechnet
    // wird aus dem Verlauf, nicht aus dem Feld — sonst gingen die
    // zwischenzeitlichen Punkte verloren.
    const h = setup({ points_log: [{ id: 'p1', user: 'u1', points: 10, kind: 'checkin' }] });
    // Stand einlesen (10), dann kommt an anderer Stelle etwas dazu.
    h.lib.recomputeTotal(h.records.user);
    expect(h.records.user.get('points_total')).toBe(10);

    const col = h.dao.findCollectionByNameOrId('points_log');
    const nachzuegler = h.newRecord('points_log', { user: 'u1', points: 500, kind: 'badge' });
    h.dao.saveRecord(nachzuegler);
    expect(col.name).toBe('points_log');

    // Dasselbe (nun veraltete) Objekt noch einmal rechnen lassen.
    h.lib.recomputeTotal(h.records.user);
    expect(h.records.user.get('points_total')).toBe(510);
  });

  it('haelt den Stand bei wiederholtem Rechnen stabil', () => {
    // Zweimal rechnen darf nicht zweimal addieren — genau der Fehler, den ein
    // Hochzaehlen im Speicher machen wuerde.
    const h = setup({
      points_log: [
        { id: 'p1', user: 'u1', points: 10, kind: 'checkin' },
        { id: 'p2', user: 'u1', points: 30, kind: 'scan' },
      ],
    });
    h.lib.recomputeTotal(h.records.user);
    h.lib.recomputeTotal(h.records.user);
    h.lib.recomputeTotal(h.records.user);
    expect(h.records.user.get('points_total')).toBe(40);
  });

  it('schreibt den Stand auch auf den Datensatz', () => {
    // Nicht nur im Speicher: Der Wert muss gespeichert sein, sonst zeigt die
    // App beim naechsten Laden wieder den alten Stand.
    const h = setup({ points_log: [{ id: 'p1', user: 'u1', points: 42, kind: 'scan' }] });
    h.lib.recomputeTotal(h.records.user);
    expect(h.dao.findRecordById('users', 'u1').get('points_total')).toBe(42);
  });
});
