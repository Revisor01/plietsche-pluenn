// Tagesgrenze, Woche und Jahr müssen mit Server in UTC und in Europe/Berlin gleich sein.

import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const { loadHook } = createRequire(import.meta.url)('./harness.js');

const ORIGINAL_TZ = process.env.TZ;

// Node liest TZ nach einer Zuweisung bei jeder Date-Operation neu.
function mitServerZeitzone(tz, fn) {
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    process.env.TZ = ORIGINAL_TZ;
  }
}

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

// Container in UTC und Host in deutscher Zeit.
const SERVER_ZEITZONEN = ['UTC', 'Europe/Berlin'];

function setup(store = {}) {
  const h = loadHook('scan.pb.js', {
    store: [Object.assign({ __name: 'store', pts_checkin: 10, pts_take: 5 }, store.store || {})],
    users: store.users || [
      { __name: 'user', id: 'u1', role: 'visitor', points_total: 0, streak_weeks: 0, streak_last_visit: '' },
    ],
    visits: store.visits || [],
    campaigns: [],
    action_counts: [],
    points_log: [],
    badges: [],
    user_badges: [],
    items: [],
  });
  // Leerer Puffer, sonst hinge das Ergebnis an der Reihenfolge.
  h.lib.forgetStoreTimezone();
  return h;
}

describe('Tagesgrenze: der Tag wechselt um Mitternacht Ortszeit', () => {
  // 00:30 Ortszeit am 3.8.2026 (Sommerzeit, UTC+2) = 2.8. 22:30 UTC.
  const NACHTS_HALB_EINS = new Date('2026-08-02T22:30:00.000Z');
  // 10:00 Ortszeit desselben Tages = 08:00 UTC.
  const VORMITTAGS = new Date('2026-08-03T08:00:00.000Z');
  // 23:00 Ortszeit des Vortags (2.8.) = 21:00 UTC.
  const VORABEND = new Date('2026-08-02T21:00:00.000Z');

  for (const tz of SERVER_ZEITZONEN) {
    describe(`Server in ${tz}`, () => {
      it('findet den Besuch von 00:30 Ortszeit am selben Vormittag wieder', () => {
        mitServerZeitzone(tz, () => {
          const h = setup({
            visits: [{ id: 'v1', user: 'u1', checkin_at: NACHTS_HALB_EINS.toISOString() }],
          });
          // Beide Zeitpunkte liegen nach Ortszeit am Montag, dem 3.8.
          expect(h.lib.hasVisitToday('u1', VORMITTAGS)).toBe(true);
        });
      });

      it('zählt den Besuch vom Vorabend nicht zum neuen Tag', () => {
        mitServerZeitzone(tz, () => {
          const h = setup({
            visits: [{ id: 'v1', user: 'u1', checkin_at: VORABEND.toISOString() }],
          });
          expect(h.lib.hasVisitToday('u1', VORMITTAGS)).toBe(false);
        });
      });

      it('gibt für 00:30 Ortszeit keinen zweiten Check-in-Bonus am Vormittag', () => {
        mitServerZeitzone(tz, () => {
          const h = setup();
          const user = h.records.user;

          const erster = h.lib.doCheckin(user, NACHTS_HALB_EINS, {});
          expect(erster.points).toBe(10);

          const zweiter = h.lib.doCheckin(user, VORMITTAGS, {});
          expect(zweiter.points).toBe(0);
          expect(zweiter.deduped).toBe(true);

          // Nur ein Besuch, nur ein Bonus.
          expect(h.rows('visits').length).toBe(1);
          expect(user.get('points_total')).toBe(10);
        });
      });

      it('gibt am Folgetag wieder einen vollen Bonus', () => {
        mitServerZeitzone(tz, () => {
          const h = setup();
          const user = h.records.user;

          h.lib.doCheckin(user, NACHTS_HALB_EINS, {});
          // 4.8. um 10:00 Ortszeit — ein neuer Tag.
          const folgetag = new Date('2026-08-04T08:00:00.000Z');
          const res = h.lib.doCheckin(user, folgetag, {});

          expect(res.points).toBe(10);
          expect(h.rows('visits').length).toBe(2);
          expect(user.get('points_total')).toBe(20);
        });
      });

      it('trennt den Tag auch im Winter richtig (Normalzeit, UTC+1)', () => {
        mitServerZeitzone(tz, () => {
          // 00:30 Ortszeit am 15.1.2026 = 14.1. 23:30 UTC.
          const nachts = new Date('2026-01-14T23:30:00.000Z');
          // 10:00 Ortszeit desselben Tages = 09:00 UTC.
          const vormittags = new Date('2026-01-15T09:00:00.000Z');
          const h = setup({
            visits: [{ id: 'v1', user: 'u1', checkin_at: nachts.toISOString() }],
          });
          expect(h.lib.hasVisitToday('u1', vormittags)).toBe(true);
        });
      });
    });
  }
});

describe('Wochenzählung: die Woche beginnt Montag Ortszeit', () => {
  for (const tz of SERVER_ZEITZONEN) {
    describe(`Server in ${tz}`, () => {
      it('rechnet Montag 00:30 Ortszeit der neuen Woche zu', () => {
        mitServerZeitzone(tz, () => {
          const h = setup();
          // Montag 3.8.2026 00:30 Ortszeit, in UTC noch Sonntag.
          expect(h.lib.isoWeek(new Date('2026-08-02T22:30:00.000Z'))).toBe(202632);
          // Derselbe Montag um 08:00 Ortszeit — dieselbe Woche.
          expect(h.lib.isoWeek(new Date('2026-08-03T06:00:00.000Z'))).toBe(202632);
        });
      });

      it('lässt Sonntag 23:00 Ortszeit in der alten Woche', () => {
        mitServerZeitzone(tz, () => {
          const h = setup();
          // Sonntag, 2.8.2026, 23:00 Ortszeit = 2.8. 21:00 UTC.
          expect(h.lib.isoWeek(new Date('2026-08-02T21:00:00.000Z'))).toBe(202631);
        });
      });

      it('verlängert die Serie über einen Check-in Montagnacht', () => {
        mitServerZeitzone(tz, () => {
          const h = setup({
            users: [
              {
                __name: 'user',
                id: 'u1',
                role: 'visitor',
                points_total: 0,
                streak_weeks: 3,
                // Letzter Besuch: Mittwoch der Vorwoche (KW 31).
                streak_last_visit: '2026-07-29T10:00:00.000Z',
              },
            ],
          });
          // Montag, 3.8., 00:30 Ortszeit — KW 32, also die Folgewoche.
          h.lib.updateStreak(h.records.user, new Date('2026-08-02T22:30:00.000Z'));
          expect(h.records.user.get('streak_weeks')).toBe(4);
        });
      });
    });
  }
});

describe('Ladenzeitzone ist gepflegt, nicht geerbt', () => {
  it('nimmt Europe/Berlin, wenn nichts gepflegt ist', () => {
    mitServerZeitzone('UTC', () => {
      const h = setup();
      expect(h.lib.storeTimezone()).toBe('Europe/Berlin');
    });
  });

  it('folgt der gepflegten Zeitzone des Ladens', () => {
    mitServerZeitzone('Europe/Berlin', () => {
      const h = setup({ store: { timezone: 'UTC' } });
      expect(h.lib.storeTimezone()).toBe('UTC');
      // Mit UTC als Ladenzeitzone liegt die Grenze wieder auf 00:00 UTC.
      const grenze = h.lib.storeDayStart(new Date('2026-08-03T08:00:00.000Z'));
      expect(grenze.toISOString()).toBe('2026-08-03T00:00:00.000Z');
    });
  });

  it('liest den Laden nicht für jeden Besuch erneut', () => {
    mitServerZeitzone('UTC', () => {
      const h = setup({
        visits: Array.from({ length: 50 }, (_, i) => ({
          id: `v${i}`,
          user: 'u1',
          checkin_at: new Date(Date.UTC(2026, 6, 1) - i * 7 * 86400000).toISOString(),
        })),
      });

      let gelesen = 0;
      const original = h.dao.findFirstRecordByFilter.bind(h.dao);
      h.dao.findFirstRecordByFilter = (collection, filter) => {
        if (collection === 'store') gelesen += 1;
        return original(collection, filter);
      };

      h.lib.streakFromVisits(h.records.user);
      // Ohne Puffer wäre das eine Abfrage je Besuch.
      expect(gelesen).toBe(1);
    });
  });

  it('übernimmt eine geänderte Zeitzone, sobald der Puffer verworfen ist', () => {
    mitServerZeitzone('UTC', () => {
      const h = setup();
      expect(h.lib.storeTimezone()).toBe('Europe/Berlin');

      // Gesetzt und gespeichert wie über die Verwaltung.
      const laden = h.records.store;
      laden.set('timezone', 'UTC');
      h.dao.saveRecord(laden);
      h.lib.forgetStoreTimezone();

      expect(h.lib.storeTimezone()).toBe('UTC');
      const grenze = h.lib.storeDayStart(new Date('2026-08-03T08:00:00.000Z'));
      expect(grenze.toISOString()).toBe('2026-08-03T00:00:00.000Z');
    });
  });

  it('legt die Tagesgrenze im Sommer auf 22:00 UTC des Vortags', () => {
    mitServerZeitzone('UTC', () => {
      const h = setup();
      const grenze = h.lib.storeDayStart(new Date('2026-08-03T08:00:00.000Z'));
      expect(grenze.toISOString()).toBe('2026-08-02T22:00:00.000Z');
    });
  });

  it('legt die Tagesgrenze im Winter auf 23:00 UTC des Vortags', () => {
    mitServerZeitzone('UTC', () => {
      const h = setup();
      const grenze = h.lib.storeDayStart(new Date('2026-01-15T09:00:00.000Z'));
      expect(grenze.toISOString()).toBe('2026-01-14T23:00:00.000Z');
    });
  });

  it('trifft die Tagesgrenze in der Nacht der Zeitumstellung', () => {
    mitServerZeitzone('UTC', () => {
      const h = setup();
      // 29.3.2026: der Tag beginnt um 23:00 UTC am 28.3.
      const fruehSonntag = h.lib.storeDayStart(new Date('2026-03-29T00:30:00.000Z'));
      expect(fruehSonntag.toISOString()).toBe('2026-03-28T23:00:00.000Z');
      // Nach der Umstellung liegt derselbe Tag noch immer auf derselben Grenze.
      const spaetSonntag = h.lib.storeDayStart(new Date('2026-03-29T12:00:00.000Z'));
      expect(spaetSonntag.toISOString()).toBe('2026-03-28T23:00:00.000Z');

      // 25.10.2026: Umstellung zurück auf Normalzeit um 03:00 Ortszeit.
      const rueck = h.lib.storeDayStart(new Date('2026-10-25T12:00:00.000Z'));
      expect(rueck.toISOString()).toBe('2026-10-24T22:00:00.000Z');
    });
  });
});

describe('Jahreszählung: der Jahreswechsel liegt um Mitternacht Ortszeit', () => {
  for (const tz of SERVER_ZEITZONEN) {
    it(`ordnet einen Besuch am 1.1. um 00:30 Ortszeit dem neuen Jahr zu (Server in ${tz})`, () => {
      mitServerZeitzone(tz, () => {
        // Uhr vor dem Laden stellen, der Harness übernimmt Date beim Laden.
        const h = mitFestemJetzt(new Date('2026-12-31T03:40:00.000Z'), () =>
          loadHook('cron.pb.js', {
            users: [{ __name: 'u', id: 'u1' }],
            // Nach Ortszeit zwei aktive Jahre.
            visits: [
              { id: 'v1', user: 'u1', checkin_at: '2025-06-01T10:00:00.000Z' },
              { id: 'v2', user: 'u1', checkin_at: '2025-12-31T23:30:00.000Z' },
            ],
            badges: [
              {
                __name: 'badge',
                id: 'b1',
                name: 'Treue Seele',
                kind: 'single',
                trigger_type: 'years_active',
                trigger_value: 2,
              },
            ],
            user_badges: [],
            campaigns: [],
            action_counts: [],
            points_log: [],
            push_messages: [],
            store: [{ pts_checkin: 10, pts_take: 5 }],
          })
        );

        mitFestemJetzt(new Date('2026-12-31T03:40:00.000Z'), () => h.runCron('year-badges'));

        const rows = h.rows('user_badges');
        expect(rows.length).toBe(1);
        expect(rows[0].current_tier).toBe('gold');
      });
    });
  }
});

// Date.now und new Date() für die Dauer eines Aufrufs festlegen.
function mitFestemJetzt(zeitpunkt, fn) {
  const Original = globalThis.Date;
  const fest = zeitpunkt.getTime();
  class FakeDate extends Original {
    constructor(...args) {
      if (args.length === 0) super(fest);
      else super(...args);
    }
    static now() {
      return fest;
    }
  }
  globalThis.Date = FakeDate;
  try {
    return fn();
  } finally {
    globalThis.Date = Original;
  }
}
