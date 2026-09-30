// Archiv in der Teile-Übersicht: welche Teile in welcher Ansicht stehen und in
// welchen Zustand ein Teil beim Zurückholen aus dem Archiv geht.
//
// Vorher gab es weder das eine noch das andere. Archivierte Teile blieben
// unter „Alle" stehen, trugen weiter den Mülleimer-Knopf — der sie ein zweites
// Mal archivierte und sonst nichts tat — und ließen sich weder zurückholen
// noch löschen.
//
// Geprüft wird die reine Logik in mobile/lib/itemState.ts. Die Screens ziehen
// React-Native-Module nach und laufen in Node nicht.

import { describe, it, expect } from 'vitest';
import { filterItems, isArchived, restoreStatus } from '../mobile/lib/itemState.ts';

const teil = (id, felder = {}) => ({
  id,
  status: 'approved',
  is_showcase: false,
  stays_external: false,
  taken_at: '',
  archived_at: '',
  ...felder,
});

const archiviert = { status: 'archived', archived_at: '2026-09-20 10:00:00.000Z' };

const BESTAND = [
  teil('laden'),
  teil('fenster', { is_showcase: true }),
  teil('offen', { status: 'pending' }),
  teil('extern', { stays_external: true }),
  teil('weg', { taken_at: '2026-09-21 12:00:00.000Z' }),
  teil('archiv', archiviert),
  teil('archiv-extern', { ...archiviert, stays_external: true }),
  // Abgelehnte Einreichung: der Ablehnen-Knopf archiviert.
  teil('abgelehnt', { ...archiviert, created_by: 'besucherin' }),
];

const ids = (liste) => liste.map((i) => i.id);

describe('isArchived', () => {
  it('erkennt archivierte Teile am Status', () => {
    expect(isArchived(teil('a', { status: 'archived' }))).toBe(true);
  });

  it('erkennt archivierte Teile am Datum, auch ohne Status (Altbestand)', () => {
    expect(isArchived(teil('a', { status: '', archived_at: '2026-01-01 00:00:00.000Z' }))).toBe(true);
  });

  it('hält ein aktives Teil nicht für archiviert', () => {
    expect(isArchived(teil('a'))).toBe(false);
    expect(isArchived(teil('a', { status: 'pending' }))).toBe(false);
  });
});

describe('filterItems', () => {
  it('„Alle" zeigt den Bestand ohne Archiv', () => {
    expect(ids(filterItems(BESTAND, 'all'))).toEqual(['laden', 'fenster', 'offen', 'extern', 'weg']);
  });

  it('„Archiv" zeigt genau die archivierten Teile', () => {
    expect(ids(filterItems(BESTAND, 'archived'))).toEqual(['archiv', 'archiv-extern', 'abgelehnt']);
  });

  it('„Extern" zeigt kein archiviertes Teil', () => {
    expect(ids(filterItems(BESTAND, 'external'))).toEqual(['extern']);
  });

  it('die übrigen Filter bleiben, wie sie waren', () => {
    expect(ids(filterItems(BESTAND, 'showcase'))).toEqual(['fenster']);
    expect(ids(filterItems(BESTAND, 'pending'))).toEqual(['offen']);
    expect(ids(filterItems(BESTAND, 'taken'))).toEqual(['weg']);
  });
});

describe('restoreStatus', () => {
  // Freigeben zahlt dem Einreichenden Bring-Punkte (defaults.pb.js). Eine
  // abgelehnte Einreichung darf beim Zurückholen deshalb nicht still
  // freigegeben werden, sondern kommt zurück in „Zu prüfen" — dort lässt sie
  // sich wie jede andere freigeben, auch mit Aktion.
  it('abgelehnte Einreichung → zurück in „Zu prüfen"', () => {
    expect(restoreStatus(teil('a', { ...archiviert, created_by: 'besucherin' }))).toBe('pending');
  });

  it('Einreichung einer Besucherin, sichtbar per expand → „Zu prüfen"', () => {
    const it_ = teil('a', { ...archiviert, created_by: 'u1', expand: { created_by: { role: 'visitor' } } });
    expect(restoreStatus(it_)).toBe('pending');
  });

  it('schon freigegebene Einreichung (Punkte bezahlt) → wieder im Laden', () => {
    expect(restoreStatus(teil('a', { ...archiviert, created_by: 'besucherin', brought_awarded: true }))).toBe('approved');
  });

  it('vom Team angelegtes Teil → wieder im Laden', () => {
    for (const role of ['volunteer', 'admin']) {
      const it_ = teil('a', { ...archiviert, created_by: 'u1', expand: { created_by: { role } } });
      expect(restoreStatus(it_)).toBe('approved');
    }
  });

  it('Teil ohne Einreichende (Altbestand, Konto gelöscht) → wieder im Laden', () => {
    expect(restoreStatus(teil('a', { ...archiviert, created_by: '' }))).toBe('approved');
  });
});
