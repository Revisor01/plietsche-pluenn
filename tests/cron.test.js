// Tests für die zeitgesteuerten Aufgaben.
//
// Schwerpunkt ist das nächtliche Zurücksetzen der Serien: Es greift ohne
// Zutun in sichtbare Werte ein. Setzt es zu früh zurück, verliert jemand
// seine Serie zu Unrecht; setzt es zu spät zurück, zeigt die App eine Serie,
// die es nicht mehr gibt.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { loadHook } = createRequire(import.meta.url)('./harness.js');

// Ein Datum in der angegebenen Anzahl Wochen vor heute.
function vorWochen(n) {
  return new Date(Date.now() - n * 7 * 86400000).toISOString();
}

function setup(users, extra = {}) {
  return loadHook('cron.pb.js', {
    users,
    visits: extra.visits || [],
    badges: extra.badges || [],
    user_badges: extra.user_badges || [],
    campaigns: extra.campaigns || [],
    action_counts: extra.action_counts || [],
    points_log: [],
    push_messages: extra.push_messages || [],
    store: [{ pts_checkin: 10, pts_take: 5 }],
  });
}

describe('streak-reset', () => {
  it('ist als taegliche Aufgabe um 3:05 eingetragen', () => {
    const h = setup([]);
    expect(h.crons['streak-reset'].expr).toBe('5 3 * * *');
  });

  it('laesst eine Serie mit Besuch in dieser Woche stehen', () => {
    const h = setup([
      { __name: 'u', id: 'u1', streak_weeks: 4, streak_last_visit: new Date().toISOString() },
    ]);
    h.runCron('streak-reset');
    expect(h.records.u.get('streak_weeks')).toBe(4);
  });

  it('laesst eine Serie mit Besuch in der Vorwoche stehen (Karenz)', () => {
    // Eine Woche Nachsicht ist gewollt: Wer eine Woche aussetzt, verliert
    // die Serie noch nicht.
    const h = setup([
      { __name: 'u', id: 'u1', streak_weeks: 3, streak_last_visit: vorWochen(1) },
    ]);
    h.runCron('streak-reset');
    expect(h.records.u.get('streak_weeks')).toBe(3);
  });

  it('setzt eine Serie nach zwei Wochen ohne Besuch zurueck', () => {
    const h = setup([
      { __name: 'u', id: 'u1', streak_weeks: 5, streak_last_visit: vorWochen(2) },
    ]);
    h.runCron('streak-reset');
    expect(h.records.u.get('streak_weeks')).toBe(0);
  });

  it('setzt eine Serie nach langer Abwesenheit zurueck', () => {
    const h = setup([
      { __name: 'u', id: 'u1', streak_weeks: 12, streak_last_visit: vorWochen(9) },
    ]);
    h.runCron('streak-reset');
    expect(h.records.u.get('streak_weeks')).toBe(0);
  });

  it('setzt eine Serie ohne hinterlegten Besuch zurueck', () => {
    // Ein Zaehlerstand ohne jeden Besuch darf nicht stehen bleiben.
    const h = setup([{ __name: 'u', id: 'u1', streak_weeks: 3, streak_last_visit: '' }]);
    h.runCron('streak-reset');
    expect(h.records.u.get('streak_weeks')).toBe(0);
  });

  it('fasst Personen ohne laufende Serie nicht an', () => {
    const h = setup([
      { __name: 'u', id: 'u1', streak_weeks: 0, streak_last_visit: vorWochen(9) },
    ]);
    h.runCron('streak-reset');
    expect(h.records.u.get('streak_weeks')).toBe(0);
    // Kein Schreibvorgang: Der Datensatz war schon richtig.
    expect(h.dao.saved).toHaveLength(0);
  });

  it('zieht den angezeigten Abzeichen-Fortschritt beim Zuruecksetzen mit', () => {
    // Der Fortschritt liegt als Kopie in der Abzeichen-Tabelle. Ohne diese
    // Korrektur zeigt die App weiter "1/2 Wochen in Folge", obwohl die Serie
    // verfallen ist.
    const h = setup(
      [{ __name: 'u', id: 'u1', streak_weeks: 4, streak_last_visit: vorWochen(3) }],
      {
        badges: [
          {
            id: 'b1',
            name: 'Durchhalter',
            kind: 'tiered',
            trigger_type: 'streak_weeks',
            tier_bronze: 2,
            tier_silber: 4,
          },
        ],
        user_badges: [{ __name: 'ub', id: 'ub1', user: 'u1', badge: 'b1', progress: 4, current_tier: 'silber' }],
        visits: [],
      }
    );
    h.runCron('streak-reset');
    expect(h.records.u.get('streak_weeks')).toBe(0);
    // Ohne Besuche gibt es keinen Fortschritt.
    expect(h.records.ub.get('progress')).toBe(0);
  });

  it('behandelt mehrere Personen unabhaengig voneinander', () => {
    const h = setup([
      { __name: 'aktiv', id: 'u1', streak_weeks: 2, streak_last_visit: new Date().toISOString() },
      { __name: 'weg', id: 'u2', streak_weeks: 7, streak_last_visit: vorWochen(4) },
    ]);
    h.runCron('streak-reset');
    expect(h.records.aktiv.get('streak_weeks')).toBe(2);
    expect(h.records.weg.get('streak_weeks')).toBe(0);
  });
});

describe('push-scheduled', () => {
  it('laeuft jede Minute', () => {
    const h = setup([]);
    expect(h.crons['push-scheduled'].expr).toBe('* * * * *');
  });

  it('versendet eine faellige Nachricht und markiert sie als verschickt', () => {
    const gestern = new Date(Date.now() - 86400000).toISOString();
    const h = setup([], {
      push_messages: [
        {
          __name: 'msg',
          id: 'm1',
          title: 'Neue Teile da',
          body: 'Schau vorbei',
          scheduled_at: gestern,
          sent_at: '',
        },
      ],
    });
    h.runCron('push-scheduled');
    expect(h.pushed).toHaveLength(1);
    expect(h.pushed[0].title).toBe('Neue Teile da');
    expect(`${h.records.msg.get('sent_at')}`).not.toBe('');
  });

  it('ruehrt eine Nachricht mit spaeterem Zeitpunkt nicht an', () => {
    const morgen = new Date(Date.now() + 86400000).toISOString();
    const h = setup([], {
      push_messages: [
        { __name: 'msg', id: 'm1', title: 'Spaeter', body: '…', scheduled_at: morgen, sent_at: '' },
      ],
    });
    h.runCron('push-scheduled');
    expect(h.pushed).toHaveLength(0);
    expect(`${h.records.msg.get('sent_at')}`).toBe('');
  });

  it('verschickt eine bereits versandte Nachricht kein zweites Mal', () => {
    const gestern = new Date(Date.now() - 86400000).toISOString();
    const h = setup([], {
      push_messages: [
        {
          id: 'm1',
          title: 'Schon raus',
          body: '…',
          scheduled_at: gestern,
          sent_at: '2026-09-01T10:00:00.000Z',
        },
      ],
    });
    h.runCron('push-scheduled');
    expect(h.pushed).toHaveLength(0);
  });
});

describe('year-badges', () => {
  it('ist als taegliche Aufgabe um 3:40 eingetragen', () => {
    const h = setup([]);
    expect(h.crons['year-badges'].expr).toBe('40 3 * * *');
  });

  it('vergibt an einem gewoehnlichen Tag nichts', () => {
    // Der Job laeuft taeglich, handelt aber nur am 31. Dezember.
    const heute = new Date();
    if (heute.getMonth() === 11 && heute.getDate() === 31) return;

    const h = setup([{ __name: 'u', id: 'u1' }], {
      badges: [
        { id: 'b1', name: 'Treue', kind: 'single', trigger_type: 'years_active', trigger_value: 1 },
      ],
      visits: [{ id: 'v1', user: 'u1', checkin_at: new Date().toISOString() }],
    });
    h.runCron('year-badges');
    expect(h.rows('user_badges')).toHaveLength(0);
  });
});

describe('action-badges', () => {
  it('ist als taegliche Aufgabe um 3:20 eingetragen', () => {
    const h = setup([]);
    expect(h.crons['action-badges'].expr).toBe('20 3 * * *');
  });

  it('vergibt ein Aktions-Abzeichen an alle Beitragenden', () => {
    const h = setup([{ __name: 'u', id: 'u1', points_total: 0 }], {
      campaigns: [
        {
          id: 'c1',
          name: 'Fruehjahrsputz',
          badge: 'b1',
          starts_at: '2026-01-01T00:00:00.000Z',
          ends_at: '2026-12-31T23:59:59.000Z',
        },
      ],
      badges: [
        {
          id: 'b1',
          name: 'Dabei gewesen',
          kind: 'single',
          trigger_type: 'action_participation',
          points_reward: 50,
        },
      ],
      action_counts: [{ id: 'ac1', user: 'u1', campaign: 'c1', count: 2 }],
    });
    h.runCron('action-badges');
    const vergeben = h.rows('user_badges');
    expect(vergeben).toHaveLength(1);
    expect(vergeben[0].badge).toBe('b1');
    expect(vergeben[0].current_tier).toBe('gold');
    // Der Bonus wird gutgeschrieben.
    expect(h.records.u.get('points_total')).toBe(50);
  });

  it('vergibt dasselbe Abzeichen nicht zweimal', () => {
    const h = setup([{ __name: 'u', id: 'u1', points_total: 50 }], {
      campaigns: [
        {
          id: 'c1',
          badge: 'b1',
          starts_at: '2026-01-01T00:00:00.000Z',
          ends_at: '2026-12-31T23:59:59.000Z',
        },
      ],
      badges: [
        {
          id: 'b1',
          name: 'Dabei gewesen',
          kind: 'single',
          trigger_type: 'action_participation',
          points_reward: 50,
        },
      ],
      action_counts: [{ id: 'ac1', user: 'u1', campaign: 'c1', count: 2 }],
      user_badges: [{ id: 'ub1', user: 'u1', badge: 'b1', progress: 1, current_tier: 'gold' }],
    });
    h.runCron('action-badges');
    expect(h.rows('user_badges')).toHaveLength(1);
    // Kein zweiter Bonus.
    expect(h.records.u.get('points_total')).toBe(50);
  });
});
