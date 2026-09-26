// Fachliche Randfälle (Befund T-7): Stellen, an denen ein Vergleich mit `<`
// statt `<=`, ein `v && v > 0` oder ein fehlender Datensatz still ein anderes
// Ergebnis liefert, als man beim Lesen erwartet.
//
// Die Tests halten das HEUTIGE Verhalten fest. Wo es fachlich fragwürdig wirkt,
// steht das im Kommentar — geändert wird der Hook hier nicht (siehe CLAUDE.md,
// „Beim Ändern der Fachlogik"). Erwartete Punktwerte werden, wo es um
// Rückfallwerte geht, aus den Konstanten in lib/points.js gelesen und nicht
// abgeschrieben.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';

const { loadHook } = createRequire(import.meta.url)('./harness.js');

const ROUTE = 'POST /api/pp/scan';
const DOOR = 'geheim-tuer-code';

// Fester Zeitpunkt: Samstag, 26.09.2026, 12:00 Uhr in Büsum (UTC+2).
const JETZT = '2026-09-26T10:00:00.000Z';

function iso(ms) {
  return new Date(ms).toISOString();
}

function scanSetup(overrides = {}) {
  const store =
    overrides.store === null
      ? []
      : [
          Object.assign(
            {
              __name: 'store',
              lat: 54.1333,
              lng: 8.8567,
              pts_checkin: 10,
              pts_take: 5,
              max_items_take: 7,
            },
            overrides.store || {}
          ),
        ];
  return loadHook('scan.pb.js', {
    store,
    store_secrets: [{ __name: 'secret', checkin_qr_secret: DOOR }],
    users: [
      {
        __name: 'user',
        id: 'user1',
        role: 'visitor',
        points_total: 0,
        streak_weeks: 0,
        streak_last_visit: '',
      },
    ],
    items: overrides.items || [],
    visits: overrides.visits || [],
    points_log: [],
    campaigns: overrides.campaigns || [],
    action_counts: [],
    badges: [],
    user_badges: [],
  });
}

function scan(h, body) {
  return h.call(ROUTE, { body, authRecord: h.records.user });
}

function scanFehler(h, body) {
  try {
    scan(h, body);
  } catch (e) {
    return e;
  }
  return null;
}

// Aktion rund um JETZT, ein Tag vorher bis ein Tag nachher.
function aktion(felder) {
  const t = new Date(JETZT).getTime();
  return Object.assign(
    {
      id: 'camp1',
      name: 'Testaktion',
      starts_at: iso(t - 86400000),
      ends_at: iso(t + 86400000),
      multiplier: 1,
    },
    felder
  );
}

afterEach(() => {
  vi.useRealTimers();
});

// Vor loadHook aufrufen: Der Harness reicht das globale Date an die
// Hook-Umgebung weiter, und das muss dann schon das gestellte sein.
function amZeitpunkt(isoZeit) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(isoZeit));
}

// ── 1. Höchstzahl mitgenommener Teile ────────────────────────────

describe('Hoechstzahl mitgenommener Teile, genau an der Grenze', () => {
  it('nimmt genau 7 Teile in einem Scan an und schreibt alle 7 gut', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup();
    const res = scan(h, { qr_code: DOOR, items_count: 7 });
    expect(res.status).toBe(200);
    // 10 fuer den Besuch + 7 x 5 fuer die Teile.
    expect(res.body.points).toBe(45);
    expect(h.rows('visits')[0].items_count).toBe(7);
  });

  it('lehnt 8 Teile in einem Scan ab, ohne Besuch und ohne Punkte', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup();
    const err = scanFehler(h, { qr_code: DOOR, items_count: 8 });
    expect(err.status).toBe(400);
    expect(err.message).toBe('Höchstens 7 Teile pro Besuch.');
    expect(h.rows('visits')).toHaveLength(0);
    expect(h.rows('points_log')).toHaveLength(0);
  });

  it('laesst nach 6 Teilen heute das 7. Teil zu', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({
      visits: [
        {
          id: 'v1',
          user: 'user1',
          checkin_at: iso(new Date(JETZT).getTime() - 3600000),
          items_count: 6,
        },
      ],
    });
    const res = scan(h, { qr_code: DOOR, items_count: 1 });
    expect(res.status).toBe(200);
    expect(res.body.already_checked_in).toBe(true);
    expect(res.body.points).toBe(5);
  });

  it('laesst nach 6 Teilen heute auch das 8. und 9. Teil zu — die Grenze gilt nur je Scan', () => {
    // FACHLICH FRAGWUERDIG: Der CHANGELOG sagt „Maximal 7 Teile pro Besuch:
    // Mehr Teile lassen sich beim Scannen/Eintragen nicht gutschreiben."
    // Tatsaechlich prueft scan.pb.js nur die Zahl im einzelnen Aufruf
    // (rawCount > cfg.maxItemsTake), nicht die Summe des Tages. Wer schon
    // eingecheckt ist, kann den Tuer-Code erneut scannen und bekommt weitere
    // Teile gutgeschrieben. Der Besuch selbst behaelt dabei seine 6 — die
    // zusaetzlichen Teile stehen nur im Punkteverlauf.
    amZeitpunkt(JETZT);
    const h = scanSetup({
      visits: [
        {
          id: 'v1',
          user: 'user1',
          checkin_at: iso(new Date(JETZT).getTime() - 3600000),
          items_count: 6,
        },
      ],
    });
    const res = scan(h, { qr_code: DOOR, items_count: 3 });
    expect(res.status).toBe(200);
    expect(res.body.points).toBe(15);
    expect(h.rows('visits')).toHaveLength(1);
    expect(h.rows('visits')[0].items_count).toBe(6);
  });

  it('zaehlt gescannte Teile nicht gegen die Hoechstzahl', () => {
    // Gleiche Luecke von der anderen Seite: Nach 7 Teilen per Zaehler geht
    // ein Teil mit eigenem QR-Code ohne Pruefung durch.
    amZeitpunkt(JETZT);
    const h = scanSetup({
      visits: [
        {
          id: 'v1',
          user: 'user1',
          checkin_at: iso(new Date(JETZT).getTime() - 3600000),
          items_count: 7,
        },
      ],
      items: [{ id: 'i1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    const res = scan(h, { qr_code: 'PP-0001' });
    expect(res.status).toBe(200);
    expect(res.body.item_points).toBe(30);
  });
});

// ── 2. Aktionsfaktoren ───────────────────────────────────────────

describe('Aktionsfaktoren an den Raendern', () => {
  it('Faktor 0 aufs Mitnehmen gibt normale Punkte und keine Teilnahme', () => {
    // FACHLICH FRAGWUERDIG: campaignMult prueft `v && v > 0`. Eine 0 gilt
    // damit als „nicht gesetzt" und faellt auf das Altfeld `multiplier`
    // zurueck, hier 1. Wer 0 eintraegt, um Mitnehmen in der Aktion
    // auszuschliessen, bekommt stattdessen die normalen Punkte.
    amZeitpunkt(JETZT);
    const h = scanSetup({ campaigns: [aktion({ mult_visit: 1, mult_take: 0, mult_bring: 1 })] });
    const res = scan(h, { qr_code: DOOR, items_count: 2 });
    expect(res.body.points).toBe(10 + 10);
    expect(h.rows('action_counts')).toHaveLength(0);
  });

  it('Faktor 0 aufs Mitnehmen erbt den Altfaktor der Aktion', () => {
    // FACHLICH FRAGWUERDIG, und schaerfer als oben: Die App speichert beim
    // Anlegen multiplier = max(mult_visit, mult_take, mult_bring). Steht
    // Vorbeikommen auf x2 und Mitnehmen auf 0, bekommt Mitnehmen ueber den
    // Rueckfall ebenfalls x2 — und zaehlt als Teilnahme.
    amZeitpunkt(JETZT);
    const h = scanSetup({
      campaigns: [aktion({ mult_visit: 2, mult_take: 0, mult_bring: 1, multiplier: 2 })],
    });
    const res = scan(h, { qr_code: DOOR, items_count: 2 });
    // 10 x 2 fuer den Besuch + 2 x 5 x 2 fuer die Teile.
    expect(res.body.points).toBe(20 + 20);
    const counts = h.rows('action_counts');
    expect(counts).toHaveLength(1);
    // 1 fuer den Besuch, 2 fuer die Teile.
    expect(counts[0].count).toBe(3);
  });

  it('Faktor 0,5 halbiert die Punkte fuers Mitnehmen und zaehlt keine Teilnahme', () => {
    // Ein Faktor unter 1 wirkt als Abzug — die App bietet nur x1, x2, x3 an,
    // ueber die Verwaltungsoberflaeche ist 0,5 aber speicherbar (min: 0).
    amZeitpunkt(JETZT);
    const h = scanSetup({ campaigns: [aktion({ mult_visit: 1, mult_take: 0.5, mult_bring: 1 })] });
    const res = scan(h, { qr_code: DOOR, items_count: 2 });
    // 2 x 5 x 0,5 = 5.
    expect(res.body.points).toBe(10 + 5);
    expect(h.rows('action_counts')).toHaveLength(0);
  });

  it('Faktor 0,5 rundet bei einem Teil auf 3 statt 2,5', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({ campaigns: [aktion({ mult_visit: 1, mult_take: 0.5, mult_bring: 1 })] });
    const res = scan(h, { qr_code: DOOR, items_count: 1 });
    expect(res.body.points).toBe(10 + 3);
  });

  it('Faktor 0,5 halbiert auch ein gescanntes Teil', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({
      campaigns: [aktion({ mult_visit: 1, mult_take: 0.5, mult_bring: 1 })],
      items: [{ id: 'i1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    const res = scan(h, { qr_code: 'PP-0001' });
    expect(res.body.item_points).toBe(15);
    expect(res.body.checkin_points).toBe(10);
    expect(h.rows('action_counts')).toHaveLength(0);
  });

  it('ein negativer Faktor faellt auf den Altfaktor zurueck, hier 1', () => {
    // PocketBase wuerde -1 wegen min: 0 gar nicht speichern; der Harness
    // prueft min nicht. Der Test haelt fest, dass die Rechenlogik einen
    // solchen Wert trotzdem nicht als Abzug anwendet.
    amZeitpunkt(JETZT);
    const h = scanSetup({ campaigns: [aktion({ mult_visit: 1, mult_take: -1, mult_bring: 1 })] });
    const res = scan(h, { qr_code: DOOR, items_count: 2 });
    expect(res.body.points).toBe(10 + 10);
    expect(h.rows('action_counts')).toHaveLength(0);
  });

  describe('bumpActionCount', () => {
    function libSetup(camp) {
      const h = loadHook('scan.pb.js', {
        users: [{ __name: 'user', id: 'user1', role: 'visitor' }],
        campaigns: [Object.assign({ __name: 'camp', id: 'camp1' }, camp)],
        action_counts: [],
      });
      return h;
    }

    it('zaehlt bei Faktor genau 1 keine Teilnahme', () => {
      const h = libSetup({ mult_take: 1, multiplier: 1 });
      h.lib.bumpActionCount(h.records.user, h.records.camp, 'take', 3);
      expect(h.rows('action_counts')).toHaveLength(0);
    });

    it('zaehlt bei Faktor 1,01 knapp ueber der Grenze jedes Teil', () => {
      const h = libSetup({ mult_take: 1.01, multiplier: 1 });
      h.lib.bumpActionCount(h.records.user, h.records.camp, 'take', 3);
      const counts = h.rows('action_counts');
      expect(counts).toHaveLength(1);
      expect(counts[0].count).toBe(3);
    });

    it('zaehlt bei Faktor 0,5 keine Teilnahme', () => {
      const h = libSetup({ mult_take: 0.5, multiplier: 1 });
      h.lib.bumpActionCount(h.records.user, h.records.camp, 'take', 3);
      expect(h.rows('action_counts')).toHaveLength(0);
    });

    it('zaehlt bei Anzahl 0 nichts, auch mit Bonus', () => {
      const h = libSetup({ mult_take: 2, multiplier: 2 });
      h.lib.bumpActionCount(h.records.user, h.records.camp, 'take', 0);
      expect(h.rows('action_counts')).toHaveLength(0);
    });
  });
});

// ── 3. Zeitgrenzen einer Aktion ──────────────────────────────────

describe('Zeitgrenzen einer Aktion, auf die Sekunde', () => {
  const T = new Date(JETZT).getTime();

  function mitAktion(startsAt, endsAt) {
    return scanSetup({
      campaigns: [aktion({ starts_at: iso(startsAt), ends_at: iso(endsAt), mult_visit: 2, multiplier: 2 })],
    });
  }

  it('Aktion mit Start gleich Ende gilt genau in diesem Moment', () => {
    amZeitpunkt(JETZT);
    const h = mitAktion(T, T);
    const res = scan(h, { qr_code: DOOR });
    expect(res.body.points).toBe(20);
    expect(h.rows('visits')[0].campaign).toBe('camp1');
  });

  it('Aktion mit Start gleich Ende gilt eine Sekunde spaeter nicht mehr', () => {
    amZeitpunkt(iso(T + 1000));
    const h = mitAktion(T, T);
    const res = scan(h, { qr_code: DOOR });
    expect(res.body.points).toBe(10);
    expect(h.rows('visits')[0].campaign).toBe('');
  });

  it('gilt genau zum Startzeitpunkt', () => {
    amZeitpunkt(JETZT);
    const h = mitAktion(T, T + 3600000);
    expect(scan(h, { qr_code: DOOR }).body.points).toBe(20);
  });

  it('gilt eine Sekunde vor dem Start noch nicht', () => {
    amZeitpunkt(iso(T - 1000));
    const h = mitAktion(T, T + 3600000);
    expect(scan(h, { qr_code: DOOR }).body.points).toBe(10);
  });

  it('gilt genau zum Endzeitpunkt', () => {
    amZeitpunkt(iso(T + 3600000));
    const h = mitAktion(T, T + 3600000);
    expect(scan(h, { qr_code: DOOR }).body.points).toBe(20);
  });

  it('gilt eine Sekunde nach dem Ende nicht mehr', () => {
    amZeitpunkt(iso(T + 3600000 + 1000));
    const h = mitAktion(T, T + 3600000);
    expect(scan(h, { qr_code: DOOR }).body.points).toBe(10);
  });

  it('gilt in der letzten halben Sekunde des Endtags nicht mehr', () => {
    // Die App speichert das Ende als 23:59:59.000 Ortszeit (dayEndIso in der
    // Aktionsverwaltung). Ein Scan um 23:59:59,5 liegt dahinter. Praktisch
    // folgenlos, der Laden hat dann zu — festgehalten, weil die Grenze
    // nicht „bis Mitternacht" ist, wie der Kommentar dort nahelegt.
    const ende = new Date('2026-09-26T21:59:59.000Z').getTime(); // 23:59:59 in Büsum
    amZeitpunkt(iso(ende + 500));
    const h = mitAktion(T, ende);
    expect(scan(h, { qr_code: DOOR }).body.points).toBe(10);
  });
});

// ── 4. Laden-Datensatz fehlt oder ist leer ───────────────────────

describe('Laden-Datensatz fehlt oder ist nicht gepflegt', () => {
  it('scan antwortet mit 500 „Laden nicht konfiguriert", ohne etwas anzulegen', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({ store: null });
    const err = scanFehler(h, { qr_code: DOOR });
    expect(err.status).toBe(500);
    expect(err.message).toBe('Laden nicht konfiguriert');
    expect(h.rows('visits')).toHaveLength(0);
    expect(h.rows('points_log')).toHaveLength(0);
  });

  it('config() liefert ohne Laden-Datensatz die Rueckfallwerte', () => {
    const h = loadHook('scan.pb.js', { store: [] });
    expect(h.lib.config()).toEqual({
      checkin: h.lib.POINTS.checkin,
      takePerItem: h.lib.POINTS.takePerItem,
      bringPerItem: h.lib.POINTS.bringPerItem,
      maxItemsTake: h.lib.DEFAULT_MAX_ITEMS_TAKE,
    });
  });

  it('config() nimmt die Rueckfallwerte, wenn die Felder auf 0 stehen', () => {
    // FACHLICH FRAGWUERDIG: 0 ist vom Leerwert nicht zu unterscheiden. Wer im
    // Laden-Datensatz pts_take auf 0 setzt, um Mitnehmen nicht mehr zu
    // belohnen, bekommt weiter den Rueckfallwert.
    const h = loadHook('scan.pb.js', {
      store: [{ pts_checkin: 0, pts_take: 0, pts_bring: 0, max_items_take: 0 }],
    });
    expect(h.lib.config()).toEqual({
      checkin: h.lib.POINTS.checkin,
      takePerItem: h.lib.POINTS.takePerItem,
      bringPerItem: h.lib.POINTS.bringPerItem,
      maxItemsTake: h.lib.DEFAULT_MAX_ITEMS_TAKE,
    });
  });

  it('config() nimmt gepflegte Werte ueber 0 unveraendert', () => {
    const h = loadHook('scan.pb.js', {
      store: [{ pts_checkin: 12, pts_take: 3, pts_bring: 8, max_items_take: 4 }],
    });
    expect(h.lib.config()).toEqual({ checkin: 12, takePerItem: 3, bringPerItem: 8, maxItemsTake: 4 });
  });

  it('ein Scan mit leeren Feldern rechnet mit den Rueckfallwerten', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({ store: { pts_checkin: 0, pts_take: 0, max_items_take: 0 } });
    const res = scan(h, { qr_code: DOOR, items_count: 2 });
    expect(res.body.points).toBe(h.lib.POINTS.checkin + 2 * h.lib.POINTS.takePerItem);
  });

  it('ein Scan mit leeren Feldern begrenzt auf die Rueckfall-Hoechstzahl', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({ store: { max_items_take: 0 } });
    const max = h.lib.DEFAULT_MAX_ITEMS_TAKE;
    const err = scanFehler(h, { qr_code: DOOR, items_count: max + 1 });
    expect(err.status).toBe(400);
    expect(err.message).toBe(`Höchstens ${max} Teile pro Besuch.`);
  });
});

// ── 5. Freigabe eines Teils von einem Konto ohne Rolle ───────────

describe('Freigabe eines eingereichten Teils, einreichendes Konto ohne Rolle', () => {
  function setup(role) {
    return loadHook('defaults.pb.js', {
      users: [{ __name: 'person', id: 'u1', role, points_total: 0 }],
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
      campaigns: [],
      action_counts: [],
      points_log: [],
      badges: [],
      user_badges: [],
      store: [{ pts_bring: 5 }],
    });
  }

  it('gibt ohne Rolle keine Bring-Punkte und markiert das Teil nicht als bezahlt', () => {
    // Heutiges Verhalten: defaults.pb.js zahlt nur, wenn role === 'visitor'.
    // Ein leeres Rollenfeld faellt damit wie ein Teammitglied heraus. In
    // Produktion gibt es derzeit 0 Konten ohne Rolle (gemessen) — neue
    // Konten bekommen beim Anlegen 'visitor'. Faellt das Rollenfeld je leer
    // aus, bleibt das Teil unbezahlt, aber auch nicht als bezahlt markiert:
    // Eine spaetere Freigabe nach Nachtragen der Rolle zahlt dann noch.
    const h = setup('');
    h.fireRecordHook('afterUpdate', 'items', h.records.teil);
    expect(h.records.person.get('points_total')).toBe(0);
    expect(h.rows('points_log')).toHaveLength(0);
    expect(h.records.teil.get('brought_awarded')).toBe(false);
  });

  it('Gegenprobe: mit Rolle visitor gibt es die Bring-Punkte', () => {
    const h = setup('visitor');
    h.fireRecordHook('afterUpdate', 'items', h.records.teil);
    expect(h.records.person.get('points_total')).toBe(5);
    expect(h.records.teil.get('brought_awarded')).toBe(true);
  });
});
