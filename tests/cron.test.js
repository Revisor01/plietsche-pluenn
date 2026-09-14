// Tests für die zeitgesteuerten Aufgaben.
//
// Schwerpunkt ist das nächtliche Zurücksetzen der Serien: Es greift ohne
// Zutun in sichtbare Werte ein. Setzt es zu früh zurück, verliert jemand
// seine Serie zu Unrecht; setzt es zu spät zurück, zeigt die App eine Serie,
// die es nicht mehr gibt.

import { describe, it, expect, afterEach, vi } from 'vitest';
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

describe('streak-reset am Jahreswechsel', () => {
  // Die Karenz rechnet gegen die laufende Woche. Fuer den Jahreswechsel
  // braucht es deshalb einen festen Zeitpunkt.
  afterEach(() => {
    vi.useRealTimers();
  });

  function amTag(iso) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  }

  it('laesst die Serie stehen, wenn die Vorwoche die 53. war', () => {
    // Lauf am 5.1.2027 (KW 1/2027), letzter Besuch in KW 53/2026 — die
    // unmittelbare Vorwoche, also Karenz.
    amTag('2027-01-05T03:05:00.000Z');
    const h = setup([
      { __name: 'u', id: 'u1', streak_weeks: 6, streak_last_visit: '2026-12-29T12:00:00.000Z' },
    ]);
    h.runCron('streak-reset');
    expect(h.records.u.get('streak_weeks')).toBe(6);
  });

  it('setzt zurueck, wenn die 53. Woche ausgelassen wurde', () => {
    // Letzter Besuch in KW 52/2026, dazwischen liegt die ausgelassene KW 53 —
    // zwei Wochen ohne Besuch, die Karenz ist aufgebraucht.
    amTag('2027-01-05T03:05:00.000Z');
    const h = setup([
      { __name: 'u', id: 'u1', streak_weeks: 6, streak_last_visit: '2026-12-21T12:00:00.000Z' },
    ]);
    h.runCron('streak-reset');
    expect(h.records.u.get('streak_weeks')).toBe(0);
  });

  it('laesst die Serie stehen, wenn das Vorjahr nur 52 Wochen hatte', () => {
    // 2025 endet mit KW 52; am 5.1.2026 (KW 2/2026) ist ein Besuch in
    // KW 52/2025 zwei Wochen her — das ist zu lang.
    // Gegenprobe mit einem Lauf in KW 1/2026: dann ist es die Vorwoche.
    amTag('2025-12-31T03:05:00.000Z'); // KW 1/2026
    const h = setup([
      { __name: 'u', id: 'u1', streak_weeks: 3, streak_last_visit: '2025-12-22T12:00:00.000Z' },
    ]);
    h.runCron('streak-reset');
    expect(h.records.u.get('streak_weeks')).toBe(3);
  });

  it('setzt nach einer Luecke von zwei Jahren zurueck', () => {
    // Letzter Besuch KW 52/2025, Lauf in KW 1/2027: ein ganzes Jahr dazwischen.
    amTag('2027-01-05T03:05:00.000Z');
    const h = setup([
      { __name: 'u', id: 'u1', streak_weeks: 9, streak_last_visit: '2025-12-22T12:00:00.000Z' },
    ]);
    h.runCron('streak-reset');
    expect(h.records.u.get('streak_weeks')).toBe(0);
  });

  it('setzt zurueck, wenn der letzte Besuch in der Zukunft steht', () => {
    // Ein Zeitstempel aus der Zukunft ist kein gueltiger letzter Besuch. Die
    // Karenz gilt nur rueckwaerts, die Serie wird zurueckgesetzt.
    amTag('2026-09-14T03:05:00.000Z');
    const h = setup([
      { __name: 'u', id: 'u1', streak_weeks: 4, streak_last_visit: '2026-11-02T12:00:00.000Z' },
    ]);
    h.runCron('streak-reset');
    expect(h.records.u.get('streak_weeks')).toBe(0);
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
    const vorher = Date.now();
    h.runCron('push-scheduled');
    const nachher = Date.now();

    expect(h.pushed).toHaveLength(1);
    expect(h.pushed[0].title).toBe('Neue Teile da');

    // Der Versandzeitpunkt, nicht irgendein nicht-leerer Wert: Der Filter des
    // Cronjobs prueft nur auf sent_at = "", ein Hook, der hier "ja" eintraegt,
    // kaeme mit not.toBe('') durch — und die Nachricht waere fuer immer
    // abgehakt, ohne dass jemand sagen koennte, wann sie rausging.
    const gesetzt = Date.parse(`${h.records.msg.get('sent_at')}`);
    expect(Number.isNaN(gesetzt)).toBe(false);
    expect(gesetzt).toBeGreaterThanOrEqual(vorher);
    expect(gesetzt).toBeLessThanOrEqual(nachher);
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
  // Der Job handelt an genau einem Tag im Jahr. Vorher stand hier ein Test,
  // der sich am 31. Dezember per `return` selbst abschaltete — also genau an
  // dem Tag, an dem etwas passiert. Geprueft wurde damit nie die Vergabe,
  // sondern nur, dass an den uebrigen 364 Tagen nichts geschieht.
  //
  // Jetzt wird das Datum gestellt. Wichtig dabei: Der Job liest den Tag und
  // die Jahreszahl in der LADENZEITZONE (lib.storeParts), nicht in der des
  // Prozesses — die Suite laeuft in UTC, der Laden in Europe/Berlin. Im
  // Dezember ist das UTC+1.
  afterEach(() => {
    vi.useRealTimers();
  });

  function amTag(iso) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  }

  // Der Laufzeitpunkt des Cronjobs: 31.12. um 3:40 Ortszeit = 2:40 UTC.
  const SILVESTER = '2026-12-31T02:40:00.000Z';
  // Ein gewoehnlicher Tag.
  const IM_JULI = '2026-07-15T02:40:00.000Z';

  // Besuch am 1. Januar des Jahres, um die Mittagszeit.
  function besuchIm(jahr, id) {
    return { id, user: 'u1', checkin_at: `${jahr}-01-01T12:00:00.000Z` };
  }

  const TREUE_BADGES = [
    { id: 'b3', name: 'Drei Jahre dabei', kind: 'single', trigger_type: 'years_active', trigger_value: 3, points_reward: 100 },
    { id: 'b5', name: 'Fuenf Jahre dabei', kind: 'single', trigger_type: 'years_active', trigger_value: 5, points_reward: 200 },
  ];

  it('ist als taegliche Aufgabe um 3:40 eingetragen', () => {
    const h = setup([]);
    expect(h.crons['year-badges'].expr).toBe('40 3 * * *');
  });

  it('vergibt an einem gewoehnlichen Tag nichts', () => {
    amTag(IM_JULI);
    const h = setup([{ __name: 'u', id: 'u1' }], {
      badges: TREUE_BADGES,
      visits: [besuchIm(2024, 'v1'), besuchIm(2025, 'v2'), besuchIm(2026, 'v3')],
    });
    h.runCron('year-badges');
    expect(h.rows('user_badges')).toHaveLength(0);
  });

  it('vergibt am 31. Dezember die erreichte Stufe, nicht die naechsthoehere', () => {
    // Besuche in drei Kalenderjahren: Das Abzeichen fuer drei Jahre wird
    // vergeben, das fuer fuenf nicht.
    amTag(SILVESTER);
    const h = setup([{ __name: 'u', id: 'u1', points_total: 0 }], {
      badges: TREUE_BADGES,
      visits: [besuchIm(2024, 'v1'), besuchIm(2025, 'v2'), besuchIm(2026, 'v3')],
    });
    h.runCron('year-badges');

    const vergeben = h.rows('user_badges');
    expect(vergeben).toHaveLength(1);
    expect(vergeben[0].badge).toBe('b3');
    expect(vergeben[0].current_tier).toBe('gold');
    // Genau der Bonus der erreichten Stufe, nicht die Summe beider.
    expect(h.records.u.get('points_total')).toBe(100);
  });

  it('vergibt beide Stufen, wenn beide erreicht sind', () => {
    amTag(SILVESTER);
    const h = setup([{ __name: 'u', id: 'u1', points_total: 0 }], {
      badges: TREUE_BADGES,
      visits: [
        besuchIm(2022, 'v1'),
        besuchIm(2023, 'v2'),
        besuchIm(2024, 'v3'),
        besuchIm(2025, 'v4'),
        besuchIm(2026, 'v5'),
      ],
    });
    h.runCron('year-badges');
    expect(h.rows('user_badges').map((b) => b.badge).sort()).toEqual(['b3', 'b5']);
    expect(h.records.u.get('points_total')).toBe(300);
  });

  it('vergibt nichts, wenn erst ein Jahr zusammengekommen ist', () => {
    // Drei Besuche im selben Jahr sind ein aktives Jahr, nicht drei.
    amTag(SILVESTER);
    const h = setup([{ __name: 'u', id: 'u1', points_total: 0 }], {
      badges: TREUE_BADGES,
      visits: [
        { id: 'v1', user: 'u1', checkin_at: '2026-01-01T12:00:00.000Z' },
        { id: 'v2', user: 'u1', checkin_at: '2026-06-01T12:00:00.000Z' },
        { id: 'v3', user: 'u1', checkin_at: '2026-12-01T12:00:00.000Z' },
      ],
    });
    h.runCron('year-badges');
    expect(h.rows('user_badges')).toHaveLength(0);
    expect(h.records.u.get('points_total')).toBe(0);
  });

  it('vergibt ein bereits vergebenes Abzeichen nicht noch einmal', () => {
    amTag(SILVESTER);
    const h = setup([{ __name: 'u', id: 'u1', points_total: 100 }], {
      badges: TREUE_BADGES,
      visits: [besuchIm(2024, 'v1'), besuchIm(2025, 'v2'), besuchIm(2026, 'v3')],
      user_badges: [{ id: 'ub1', user: 'u1', badge: 'b3', progress: 1, current_tier: 'gold' }],
    });
    h.runCron('year-badges');
    expect(h.rows('user_badges')).toHaveLength(1);
    // Kein zweiter Bonus.
    expect(h.records.u.get('points_total')).toBe(100);
  });

  it('zaehlt einen Besuch am 31. Dezember noch fuer dieses Jahr', () => {
    // Der Grenzfall: Besuch am Silvesterabend, 20:00 Ortszeit (19:00 UTC).
    // Der Cronjob laeuft danach um 3:40 — also erst am 1.1. Hier wird der Lauf
    // vom selben Tag geprueft, mit dem Besuch am Vormittag.
    amTag(SILVESTER);
    const h = setup([{ __name: 'u', id: 'u1', points_total: 0 }], {
      badges: TREUE_BADGES,
      visits: [
        besuchIm(2024, 'v1'),
        besuchIm(2025, 'v2'),
        // 31.12.2026, 01:00 Ortszeit = 31.12. 00:00 UTC — derselbe Tag, an dem
        // der Job laeuft, und das dritte aktive Jahr.
        { id: 'v3', user: 'u1', checkin_at: '2026-12-31T00:00:00.000Z' },
      ],
    });
    h.runCron('year-badges');
    expect(h.rows('user_badges')).toHaveLength(1);
    expect(h.rows('user_badges')[0].badge).toBe('b3');
  });

  it('zaehlt einen Besuch am 1.1. um 00:30 Ortszeit ins neue Jahr', () => {
    // Der Zeitzonen-Fall: 1.1.2026 um 00:30 Ortszeit ist 31.12.2025 um 23:30
    // UTC. Wer die Jahreszahl in UTC nimmt, zaehlt diesen Besuch ins Vorjahr —
    // und dann fehlen drei Jahre, wo drei erreicht sind.
    amTag(SILVESTER);
    const h = setup([{ __name: 'u', id: 'u1', points_total: 0 }], {
      badges: TREUE_BADGES,
      visits: [
        besuchIm(2024, 'v1'),
        // 1.1.2025, 00:30 Ortszeit (Winterzeit, UTC+1).
        { id: 'v2', user: 'u1', checkin_at: '2024-12-31T23:30:00.000Z' },
        besuchIm(2026, 'v3'),
      ],
    });
    h.runCron('year-badges');
    // Jahre: 2024 (v1), 2025 (v2, in Ladenzeit), 2026 (v3) = drei.
    expect(h.rows('user_badges')).toHaveLength(1);
    expect(h.rows('user_badges')[0].badge).toBe('b3');
  });

  it('behandelt mehrere Personen unabhaengig voneinander', () => {
    amTag(SILVESTER);
    const h = setup(
      [
        { __name: 'treu', id: 'u1', points_total: 0 },
        { __name: 'neu', id: 'u2', points_total: 0 },
      ],
      {
        badges: TREUE_BADGES,
        visits: [
          besuchIm(2024, 'v1'),
          besuchIm(2025, 'v2'),
          besuchIm(2026, 'v3'),
          { id: 'v4', user: 'u2', checkin_at: '2026-05-01T12:00:00.000Z' },
        ],
      }
    );
    h.runCron('year-badges');
    const vergeben = h.rows('user_badges');
    expect(vergeben).toHaveLength(1);
    expect(vergeben[0].user).toBe('u1');
    expect(h.records.treu.get('points_total')).toBe(100);
    expect(h.records.neu.get('points_total')).toBe(0);
  });

  it('fasst gestufte Abzeichen nicht an', () => {
    // Der Job sucht ausdruecklich nach kind = "single". Ein gestuftes
    // Treue-Abzeichen liefe sonst ueber grantBadge sofort auf Gold.
    amTag(SILVESTER);
    const h = setup([{ __name: 'u', id: 'u1', points_total: 0 }], {
      badges: [
        {
          id: 'bt',
          name: 'Treue Stufen',
          kind: 'tiered',
          trigger_type: 'years_active',
          tier_bronze: 1,
          tier_gold: 3,
        },
      ],
      visits: [besuchIm(2024, 'v1'), besuchIm(2025, 'v2'), besuchIm(2026, 'v3')],
    });
    h.runCron('year-badges');
    expect(h.rows('user_badges')).toHaveLength(0);
    expect(h.records.u.get('points_total')).toBe(0);
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

  it('vergibt ein Abzeichen auch an jemanden, der nur da war', () => {
    // Zweig b): Teilnahme durch reinen Besuch im Aktionszeitraum, ohne ein
    // Teil beigesteuert zu haben.
    const h = setup([{ __name: 'u', id: 'u1', points_total: 0 }], {
      campaigns: [
        {
          id: 'c1',
          badge: 'b1',
          starts_at: '2026-03-01T00:00:00.000Z',
          ends_at: '2026-03-31T23:59:59.000Z',
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
      action_counts: [],
      visits: [{ id: 'v1', user: 'u1', checkin_at: '2026-03-15T12:00:00.000Z' }],
    });
    h.runCron('action-badges');
    expect(h.rows('user_badges')).toHaveLength(1);
    expect(h.records.u.get('points_total')).toBe(50);
  });

  it('vergibt nichts an jemanden, der ausserhalb des Aktionszeitraums da war', () => {
    // Die Gegenprobe zu Zweig b): Der Besuch liegt einen Tag nach Aktionsende.
    const h = setup([{ __name: 'u', id: 'u1', points_total: 0 }], {
      campaigns: [
        {
          id: 'c1',
          badge: 'b1',
          starts_at: '2026-03-01T00:00:00.000Z',
          ends_at: '2026-03-31T23:59:59.000Z',
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
      action_counts: [],
      visits: [{ id: 'v1', user: 'u1', checkin_at: '2026-04-01T12:00:00.000Z' }],
    });
    h.runCron('action-badges');
    expect(h.rows('user_badges')).toHaveLength(0);
    expect(h.records.u.get('points_total')).toBe(0);
  });
});

describe('action-badges: gestufte Abzeichen', () => {
  // Der Zweig, vor dem der Code im Kommentar selbst warnt: grantBadge wuerde
  // ein gestuftes Abzeichen sofort auf Gold setzen und die Stufen
  // ueberspringen — samt aller Boni, die dazwischenliegen. Zu viel vergebene
  // Punkte lassen sich nicht zurueckholen.
  //
  // Deshalb laeuft der gestufte Fall ueber checkBadges/computeProgress, und
  // genau das wird hier geprueft: die tatsaechlich erreichte Stufe und genau
  // der Bonus, der zu ihr gehoert.

  // Ein gestuftes Aktions-Abzeichen mit drei Stufen und je eigenem Bonus.
  function gestuftesSetup(count, extra = {}) {
    return setup([{ __name: 'u', id: 'u1', points_total: 0 }], {
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
          name: 'Sammlerin',
          kind: 'tiered',
          trigger_type: 'action_participation',
          // computeProgress liest die Aktion vom Abzeichen, nicht umgekehrt.
          campaign: 'c1',
          tier_bronze: 2,
          tier_silber: 5,
          tier_gold: 10,
          reward_bronze: 10,
          reward_silber: 25,
          reward_gold: 60,
        },
      ],
      action_counts: [{ id: 'ac1', user: 'u1', campaign: 'c1', count }],
      user_badges: extra.user_badges || [],
    });
  }

  it('bleibt bei vier Beitraegen auf Bronze und ueberspringt nichts', () => {
    // Schwellen 2/5/10, Stand 4: Bronze ist erreicht, Silber nicht.
    const h = gestuftesSetup(4);
    h.runCron('action-badges');

    const vergeben = h.rows('user_badges');
    expect(vergeben).toHaveLength(1);
    expect(vergeben[0].current_tier).toBe('bronze');
    expect(vergeben[0].progress).toBe(4);
    // Genau der Bronze-Bonus, nicht die Summe aller Stufen (95).
    expect(h.records.u.get('points_total')).toBe(10);
  });

  it('vergibt bei zehn Beitraegen alle drei Stufen genau einmal', () => {
    // Wer die Aktion in einem Rutsch durchlaeuft, bekommt jede Stufe — aber
    // jede nur einmal: 10 + 25 + 60.
    const h = gestuftesSetup(10);
    h.runCron('action-badges');

    const vergeben = h.rows('user_badges');
    expect(vergeben[0].current_tier).toBe('gold');
    expect(h.records.u.get('points_total')).toBe(95);
  });

  it('zahlt beim naechsten Lauf nur die neu erreichte Stufe nach', () => {
    // Stand 5 (Silber), Bronze war beim letzten Lauf schon vergeben: Es kommt
    // genau der Silber-Bonus dazu, nicht noch einmal Bronze.
    const h = gestuftesSetup(5, {
      user_badges: [{ id: 'ub1', user: 'u1', badge: 'b1', progress: 2, current_tier: 'bronze' }],
    });
    h.runCron('action-badges');

    const vergeben = h.rows('user_badges');
    expect(vergeben).toHaveLength(1);
    expect(vergeben[0].current_tier).toBe('silber');
    expect(h.records.u.get('points_total')).toBe(25);
  });

  it('vergibt bei unveraendertem Stand keinen zweiten Bonus', () => {
    const h = gestuftesSetup(4, {
      user_badges: [{ id: 'ub1', user: 'u1', badge: 'b1', progress: 4, current_tier: 'bronze' }],
    });
    h.runCron('action-badges');
    expect(h.rows('user_badges')[0].current_tier).toBe('bronze');
    expect(h.records.u.get('points_total')).toBe(0);
  });

  it('vergibt unterhalb der ersten Stufe noch nichts', () => {
    // Ein Beitrag, Bronze verlangt zwei.
    const h = gestuftesSetup(1);
    h.runCron('action-badges');
    expect(h.rows('user_badges')[0].current_tier).toBe('none');
    expect(h.records.u.get('points_total')).toBe(0);
  });

  it('fasst jemanden ohne Beitrag zur Aktion nicht an', () => {
    // Der gestufte Zweig laeuft nur ueber action_counts mit count > 0 — anders
    // als der einfache, der auch reine Besuche mitnimmt.
    const h = setup([{ __name: 'u', id: 'u1', points_total: 0 }], {
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
          name: 'Sammlerin',
          kind: 'tiered',
          trigger_type: 'action_participation',
          campaign: 'c1',
          tier_bronze: 2,
          reward_bronze: 10,
        },
      ],
      action_counts: [{ id: 'ac1', user: 'u1', campaign: 'c1', count: 0 }],
      visits: [{ id: 'v1', user: 'u1', checkin_at: '2026-06-01T12:00:00.000Z' }],
    });
    h.runCron('action-badges');
    expect(h.rows('user_badges')).toHaveLength(0);
    expect(h.records.u.get('points_total')).toBe(0);
  });

  it('die Gegenprobe: ein einfaches Abzeichen laeuft weiterhin ueber grantBadge', () => {
    // Derselbe Aufbau, nur kind: 'single'. Dann greift der andere Zweig, und
    // das Abzeichen steht sofort auf Gold — was dort richtig ist, weil es nur
    // eine Stufe gibt.
    const h = setup([{ __name: 'u', id: 'u1', points_total: 0 }], {
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
          name: 'Sammlerin',
          kind: 'single',
          trigger_type: 'action_participation',
          campaign: 'c1',
          points_reward: 50,
        },
      ],
      action_counts: [{ id: 'ac1', user: 'u1', campaign: 'c1', count: 4 }],
    });
    h.runCron('action-badges');
    expect(h.rows('user_badges')[0].current_tier).toBe('gold');
    expect(h.records.u.get('points_total')).toBe(50);
  });
});
