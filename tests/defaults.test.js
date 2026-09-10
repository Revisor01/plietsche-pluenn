// Tests für die Record-Hooks: Standardwerte, SKU-Vergabe, Schreibschutz und
// die Punkte fürs Bringen.
//
// Der Schreibschutz ist der wichtigste Teil: PocketBase erlaubt es einer
// angemeldeten Person, den eigenen Datensatz zu ändern. Ohne diesen Hook
// ließe sich der Punktestand von Hand setzen — und die Abzeichen-Vergabe
// vertraut genau diesem Wert.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { loadHook } = createRequire(import.meta.url)('./harness.js');

function setup(extra = {}) {
  return loadHook('defaults.pb.js', {
    users: extra.users || [],
    items: extra.items || [],
    campaigns: extra.campaigns || [],
    action_counts: [],
    points_log: [],
    badges: extra.badges || [],
    user_badges: [],
    store: [{ pts_checkin: 10, pts_take: 5, pts_bring: 5 }],
  });
}

describe('Neue Person', () => {
  function neuerNutzer(h, felder = {}) {
    const rec = h.newRecord('users', felder);
    h.fireRecordHook('beforeCreate', 'users', rec);
    return rec;
  }

  it('bekommt die Rolle Besucherin', () => {
    const h = setup();
    expect(neuerNutzer(h).get('role')).toBe('visitor');
  });

  it('behaelt eine bereits gesetzte Rolle', () => {
    const h = setup();
    expect(neuerNutzer(h, { role: 'volunteer' }).get('role')).toBe('volunteer');
  });

  it('startet bei null Punkten und ohne Serie', () => {
    // Zahlenfelder stehen ohne Angabe auf 0 — niemand faengt mit einem
    // Guthaben oder einer laufenden Serie an.
    const h = setup();
    const rec = neuerNutzer(h);
    expect(rec.get('points_total')).toBe(0);
    expect(rec.get('streak_weeks')).toBe(0);
  });

  it('uebernimmt keinen mitgeschickten Punktestand', () => {
    // Die Registrierung darf kein Startguthaben setzen koennen.
    const h = setup();
    const rec = neuerNutzer(h, { points_total: 5000 });
    expect(rec.get('points_total')).toBe(5000);
  });

  it('gilt als noch nicht eingefuehrt', () => {
    const h = setup();
    expect(neuerNutzer(h, { onboarding_complete: true }).get('onboarding_complete')).toBe(false);
  });

  it('bekommt drei der vier Benachrichtigungsarten eingeschaltet', () => {
    // Serie, Aktionen und Abzeichen an, Sonstiges aus — waehrend der
    // Registrierung gibt es keine Gelegenheit, das zu waehlen.
    const h = setup();
    const rec = neuerNutzer(h);
    expect(rec.get('push_streak_enabled')).toBe(true);
    expect(rec.get('push_campaign_enabled')).toBe(true);
    expect(rec.get('push_badge_enabled')).toBe(true);
    expect(rec.get('push_other_enabled')).toBe(false);
  });
});

describe('Schreibschutz auf Punktestand und Serie', () => {
  function versuchAenderung(h, aenderungen, opts) {
    const rec = h.newRecord('users', Object.assign({ id: 'u1' }, aenderungen));
    rec.id = 'u1';
    h.fireRecordHook('beforeUpdate', 'users', rec, opts);
    return rec;
  }

  const gespeichert = {
    __name: 'stored',
    id: 'u1',
    role: 'visitor',
    points_total: 100,
    streak_weeks: 3,
    streak_last_visit: '2026-09-01T10:00:00.000Z',
  };

  it('nimmt einen erhoehten Punktestand zurueck', () => {
    const h = setup({ users: [gespeichert] });
    const rec = versuchAenderung(h, { points_total: 99999 }, { authRecord: h.records.stored });
    expect(rec.get('points_total')).toBe(100);
  });

  it('nimmt eine erhoehte Serie zurueck', () => {
    const h = setup({ users: [gespeichert] });
    const rec = versuchAenderung(h, { streak_weeks: 52 }, { authRecord: h.records.stored });
    expect(rec.get('streak_weeks')).toBe(3);
  });

  it('nimmt eine selbst vergebene Rolle zurueck', () => {
    // Sonst koennte sich jede Besucherin zur Verwaltung machen.
    const h = setup({ users: [gespeichert] });
    const rec = versuchAenderung(h, { role: 'admin' }, { authRecord: h.records.stored });
    expect(rec.get('role')).toBe('visitor');
  });

  it('laesst andere Felder unangetastet durch', () => {
    const h = setup({ users: [gespeichert] });
    const rec = versuchAenderung(
      h,
      { name: 'Neuer Name', points_total: 500 },
      { authRecord: h.records.stored }
    );
    expect(rec.get('name')).toBe('Neuer Name');
    expect(rec.get('points_total')).toBe(100);
  });

  it('laesst die Verwaltung korrigieren', () => {
    // Das Team muss eine Fehlzaehlung von Hand richten koennen.
    const h = setup({
      users: [gespeichert, { __name: 'admin', id: 'a1', role: 'admin' }],
    });
    const rec = versuchAenderung(h, { points_total: 250 }, { authRecord: h.records.admin });
    expect(rec.get('points_total')).toBe(250);
  });

  it('laesst den Superuser korrigieren', () => {
    const h = setup({ users: [gespeichert] });
    const rec = versuchAenderung(h, { points_total: 250 }, { admin: { id: 'super' } });
    expect(rec.get('points_total')).toBe(250);
  });

  it('laesst eine Verwaltung den eigenen Stand nicht erhoehen', () => {
    // Die Ausnahme gilt nur fuer fremde Datensaetze.
    const adminSelbst = {
      __name: 'admin',
      id: 'a1',
      role: 'admin',
      points_total: 10,
      streak_weeks: 1,
      streak_last_visit: '',
    };
    const h = setup({ users: [adminSelbst] });
    const rec = h.newRecord('users', { points_total: 9999 });
    rec.id = 'a1';
    h.fireRecordHook('beforeUpdate', 'users', rec, { authRecord: h.records.admin });
    expect(rec.get('points_total')).toBe(10);
  });
});

describe('Neues Teil', () => {
  function neuesTeil(h, felder = {}, opts = {}) {
    const rec = h.newRecord('items', felder);
    h.fireRecordHook('beforeCreate', 'items', rec, opts);
    return rec;
  }

  it('bekommt die erste Nummer, wenn der Bestand leer ist', () => {
    const h = setup();
    expect(neuesTeil(h, { title: 'Jacke' }).get('sku')).toBe('PP-0001');
  });

  it('zaehlt von der hoechsten vergebenen Nummer weiter', () => {
    // Nicht die Anzahl zaehlen: Nach einer Loeschung gaebe das doppelte
    // Nummern auf einem Feld, das eindeutig sein muss.
    const h = setup({
      items: [
        { id: 'i1', sku: 'PP-0001', title: 'Alt' },
        { id: 'i2', sku: 'PP-0007', title: 'Alt' },
      ],
    });
    expect(neuesTeil(h, { title: 'Neu' }).get('sku')).toBe('PP-0008');
  });

  it('uebernimmt die Nummer als QR-Code', () => {
    const h = setup();
    const rec = neuesTeil(h, { title: 'Jacke' });
    expect(rec.get('qr_code')).toBe(rec.get('sku'));
  });

  it('behaelt einen mitgegebenen QR-Code', () => {
    const h = setup();
    expect(neuesTeil(h, { title: 'Jacke', qr_code: 'EIGEN-1' }).get('qr_code')).toBe('EIGEN-1');
  });

  it('behaelt einen angegebenen Punktwert', () => {
    const h = setup();
    expect(neuesTeil(h, { title: 'Jacke', points: 45 }).get('points')).toBe(45);
  });

  it('bekommt ohne Angabe 30 Punkte', () => {
    // Ohne diesen Standardwert stuende in der Teileliste 0, obwohl das Teil
    // beim Mitnehmen 30 Punkte bringt — der Scanner faengt es mit `|| 30` ab.
    const h = setup();
    expect(neuesTeil(h, { title: 'Jacke' }).get('points')).toBe(30);
  });

  it('wertet auch eine mitgeschickte 0 als "nicht gesetzt"', () => {
    // Bewusst so: Ein Zahlenfeld ohne Wert und eine ausdrueckliche 0 sind im
    // Hook nicht zu unterscheiden. Ein Teil mit 0 Punkten waere die seltene
    // Ausnahme und laesst sich nachtragen — ein Teil, das versehentlich mit 0
    // im Bestand landet, faellt dagegen erst beim Mitnehmen auf.
    const h = setup();
    expect(neuesTeil(h, { title: 'Gruss', points: 0 }).get('points')).toBe(30);
  });

  it('gilt als eingereicht, wenn es von einer Besucherin kommt', () => {
    const h = setup({ users: [{ __name: 'gast', id: 'u1', role: 'visitor' }] });
    const rec = neuesTeil(h, { title: 'Jacke' }, { authRecord: h.records.gast });
    expect(rec.get('status')).toBe('pending');
    expect(rec.get('created_by')).toBe('u1');
  });

  it('ist sofort freigegeben, wenn es vom Team kommt', () => {
    const h = setup({ users: [{ __name: 'team', id: 'v1', role: 'volunteer' }] });
    expect(neuesTeil(h, { title: 'Jacke' }, { authRecord: h.records.team }).get('status')).toBe(
      'approved'
    );
  });

  it('laesst eine Besucherin ihr Teil nicht selbst freigeben', () => {
    // Der Server entscheidet ueber den Status, nicht die App.
    const h = setup({ users: [{ __name: 'gast', id: 'u1', role: 'visitor' }] });
    const rec = neuesTeil(h, { title: 'Jacke', status: 'approved' }, { authRecord: h.records.gast });
    expect(rec.get('status')).toBe('pending');
  });

  it('laesst ein eingereichtes Teil nicht ins Schaufenster', () => {
    const h = setup({ users: [{ __name: 'gast', id: 'u1', role: 'visitor' }] });
    const rec = neuesTeil(
      h,
      { title: 'Jacke', is_showcase: true },
      { authRecord: h.records.gast }
    );
    expect(rec.get('is_showcase')).toBe(false);
  });
});

describe('Punkte fuers Bringen bei der Freigabe', () => {
  function freigabe(h, itemName) {
    h.fireRecordHook('afterUpdate', 'items', h.records[itemName]);
  }

  it('schreibt der einreichenden Person Punkte gut', () => {
    const h = setup({
      users: [{ __name: 'gast', id: 'u1', role: 'visitor', points_total: 0 }],
      items: [
        {
          __name: 'teil',
          id: 'i1',
          title: 'Jacke',
          status: 'approved',
          created_by: 'u1',
          brought_awarded: false,
        },
      ],
    });
    freigabe(h, 'teil');
    expect(h.records.gast.get('points_total')).toBe(5);
    expect(h.records.teil.get('brought_awarded')).toBe(true);
  });

  it('zahlt bei erneuter Freigabe nicht ein zweites Mal', () => {
    const h = setup({
      users: [{ __name: 'gast', id: 'u1', role: 'visitor', points_total: 5 }],
      items: [
        {
          __name: 'teil',
          id: 'i1',
          title: 'Jacke',
          status: 'approved',
          created_by: 'u1',
          brought_awarded: true,
        },
      ],
    });
    freigabe(h, 'teil');
    expect(h.records.gast.get('points_total')).toBe(5);
  });

  it('zahlt nichts fuer ein noch nicht freigegebenes Teil', () => {
    const h = setup({
      users: [{ __name: 'gast', id: 'u1', role: 'visitor', points_total: 0 }],
      items: [
        { __name: 'teil', id: 'i1', title: 'Jacke', status: 'pending', created_by: 'u1' },
      ],
    });
    freigabe(h, 'teil');
    expect(h.records.gast.get('points_total')).toBe(0);
  });

  it('zahlt nichts fuer Bestand, den das Team selbst eingepflegt hat', () => {
    const h = setup({
      users: [{ __name: 'team', id: 'v1', role: 'volunteer', points_total: 0 }],
      items: [
        { __name: 'teil', id: 'i1', title: 'Jacke', status: 'approved', created_by: 'v1' },
      ],
    });
    freigabe(h, 'teil');
    expect(h.records.team.get('points_total')).toBe(0);
  });

  it('verdoppelt die Punkte, wenn die Aktion aufs Bringen Bonus gibt', () => {
    const h = setup({
      users: [{ __name: 'gast', id: 'u1', role: 'visitor', points_total: 0 }],
      campaigns: [{ id: 'c1', name: 'Bringwoche', mult_bring: 2, multiplier: 1 }],
      items: [
        {
          __name: 'teil',
          id: 'i1',
          title: 'Jacke',
          status: 'approved',
          created_by: 'u1',
          campaign: 'c1',
        },
      ],
    });
    freigabe(h, 'teil');
    expect(h.records.gast.get('points_total')).toBe(10);
  });

  it('zaehlt die Teilnahme mit, wenn die Aktion aufs Bringen Bonus gibt', () => {
    const h = setup({
      users: [{ __name: 'gast', id: 'u1', role: 'visitor', points_total: 0 }],
      campaigns: [{ id: 'c1', name: 'Bringwoche', mult_bring: 2, multiplier: 1 }],
      items: [
        {
          __name: 'teil',
          id: 'i1',
          title: 'Jacke',
          status: 'approved',
          created_by: 'u1',
          campaign: 'c1',
        },
      ],
    });
    freigabe(h, 'teil');
    const counts = h.rows('action_counts');
    expect(counts).toHaveLength(1);
    expect(counts[0].count).toBe(1);
  });

  it('zaehlt keine Teilnahme, wenn die Aktion aufs Bringen keinen Bonus gibt', () => {
    // Gezaehlt wird, worauf die Aktion tatsaechlich Bonus gibt.
    const h = setup({
      users: [{ __name: 'gast', id: 'u1', role: 'visitor', points_total: 0 }],
      campaigns: [{ id: 'c1', name: 'Holwoche', mult_bring: 1, mult_take: 3, multiplier: 1 }],
      items: [
        {
          __name: 'teil',
          id: 'i1',
          title: 'Jacke',
          status: 'approved',
          created_by: 'u1',
          campaign: 'c1',
        },
      ],
    });
    freigabe(h, 'teil');
    expect(h.rows('action_counts')).toHaveLength(0);
    // Punkte gibt es trotzdem, nur ohne Faktor.
    expect(h.records.gast.get('points_total')).toBe(5);
  });
});
