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

  it('lehnt nach 6 Teilen heute das 8. und 9. Teil ab — die Grenze gilt pro Tag', () => {
    // Bis 26.09.2026 galt die Grenze nur je Scan: Wer schon eingecheckt war,
    // scannte den Tuer-Code erneut und bekam weitere Teile gutgeschrieben.
    // Entscheidung des Betreibers: Die Hoechstzahl gilt pro Besuch, also pro
    // Tag in der Ladenzeitzone, ueber alle Scans.
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
    const err = scanFehler(h, { qr_code: DOOR, items_count: 3 });
    expect(err.status).toBe(400);
    expect(err.message).toBe('Höchstens 7 Teile pro Besuch. Heute geht noch 1 Teil.');
    expect(h.rows('points_log')).toHaveLength(0);
    expect(h.rows('visits')).toHaveLength(1);
    expect(h.rows('visits')[0].items_count).toBe(6);
  });

  it('zaehlt gescannte Teile gegen die Hoechstzahl: nach 7 Teilen bleibt das Teil offen', () => {
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
    const err = scanFehler(h, { qr_code: 'PP-0001' });
    expect(err.status).toBe(400);
    expect(err.message).toBe('Höchstens 7 Teile pro Besuch. Für heute ist die Grenze erreicht.');
    expect(h.rows('items')[0].taken_at).toBe('');
    expect(h.rows('points_log')).toHaveLength(0);
  });
});

// ── 1b. Tagesgrenze ueber alle Scans ─────────────────────────────
//
// Gezaehlt wird, was die Person heute (Ladenzeitzone) mitgenommen hat: die
// Zaehler-Teile aus dem Besuch des Tages (visits.items_count, jetzt auch beim
// zweiten Tuer-Scan fortgeschrieben) plus jedes per QR gescannte Teil
// (points_log mit kind = "scan" — das Teil selbst traegt keinen Personenbezug).

describe('Hoechstzahl pro Tag, ueber alle Scans', () => {
  const teil = (n) => ({
    id: `i${n}`,
    sku: `PP-000${n}`,
    qr_code: `PP-000${n}`,
    title: `Teil ${n}`,
    points: 30,
    status: 'approved',
  });

  it('zweiter Tuer-Scan am selben Tag ueber die Grenze: 400, nichts gebucht', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup();
    expect(scan(h, { qr_code: DOOR }).status).toBe(200);
    const zweiter = scan(h, { qr_code: DOOR, items_count: 5 });
    expect(zweiter.status).toBe(200);
    expect(zweiter.body.points).toBe(25);
    expect(h.rows('visits')[0].items_count).toBe(5);
    const logVorher = h.rows('points_log').length;
    const standVorher = h.rows('users')[0].points_total;

    const err = scanFehler(h, { qr_code: DOOR, items_count: 3 });
    expect(err.status).toBe(400);
    expect(err.message).toBe('Höchstens 7 Teile pro Besuch. Heute gehen noch 2 Teile.');
    expect(h.rows('points_log')).toHaveLength(logVorher);
    expect(h.rows('users')[0].points_total).toBe(standVorher);
    expect(h.rows('visits')).toHaveLength(1);
    expect(h.rows('visits')[0].items_count).toBe(5);
  });

  it('QR-Teil als 8. Teil des Tages: 400, das Teil bleibt offen', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({ items: [teil(1), teil(2), teil(3)] });
    expect(scan(h, { qr_code: 'PP-0001' }).status).toBe(200);
    expect(scan(h, { qr_code: 'PP-0002' }).status).toBe(200);
    // Zwei per QR, dazu 5 per Zaehler = 7.
    expect(scan(h, { qr_code: DOOR, items_count: 5 }).status).toBe(200);
    const logVorher = h.rows('points_log').length;

    const err = scanFehler(h, { qr_code: 'PP-0003' });
    expect(err.status).toBe(400);
    expect(err.message).toBe('Höchstens 7 Teile pro Besuch. Für heute ist die Grenze erreicht.');
    expect(h.rows('items').find((r) => r.id === 'i3').taken_at).toBe('');
    expect(h.rows('points_log')).toHaveLength(logVorher);
  });

  it('genau an der Grenze geht es: 3 per QR und 4 per Zaehler', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({ items: [teil(1), teil(2), teil(3)] });
    for (const n of [1, 2, 3]) expect(scan(h, { qr_code: `PP-000${n}` }).status).toBe(200);
    const res = scan(h, { qr_code: DOOR, items_count: 4 });
    expect(res.status).toBe(200);
    expect(res.body.points).toBe(20);
    expect(h.rows('visits')[0].items_count).toBe(4);
  });

  it('der Zaehler beim ersten Tuer-Scan zaehlt ebenfalls mit', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({ items: [teil(1)] });
    expect(scan(h, { qr_code: DOOR, items_count: 7 }).status).toBe(200);
    const err = scanFehler(h, { qr_code: 'PP-0001' });
    expect(err.status).toBe(400);
    expect(h.rows('items')[0].taken_at).toBe('');
  });

  it('am naechsten Tag ist wieder frei — Tagesgrenze ist Mitternacht im Laden', () => {
    // JETZT ist 12:00 Uhr in Buesum (UTC+2). 23:30 Uhr am Vortag ist
    // 21:30 UTC — gestern. 00:30 Uhr heute ist 22:30 UTC des Vortags — heute.
    amZeitpunkt(JETZT);
    const gestern = scanSetup({
      visits: [{ id: 'v1', user: 'user1', checkin_at: '2026-09-25T21:30:00.000Z', items_count: 7 }],
    });
    expect(scan(gestern, { qr_code: DOOR, items_count: 7 }).status).toBe(200);

    const heuteFrueh = scanSetup({
      visits: [{ id: 'v1', user: 'user1', checkin_at: '2026-09-25T22:30:00.000Z', items_count: 7 }],
    });
    const err = scanFehler(heuteFrueh, { qr_code: DOOR, items_count: 1 });
    expect(err.status).toBe(400);
    expect(err.message).toBe('Höchstens 7 Teile pro Besuch. Für heute ist die Grenze erreicht.');
  });

  it('gescannte Teile von gestern zaehlen heute nicht', () => {
    amZeitpunkt('2026-09-25T19:00:00.000Z'); // Vortag, 21:00 Uhr im Laden
    const items = [1, 2, 3, 4, 5, 6, 7, 8].map(teil);
    const h = scanSetup({ items });
    for (const n of [1, 2, 3, 4, 5, 6, 7]) expect(scan(h, { qr_code: `PP-000${n}` }).status).toBe(200);
    expect(scanFehler(h, { qr_code: 'PP-0008' }).status).toBe(400);

    vi.setSystemTime(new Date(JETZT));
    expect(scan(h, { qr_code: 'PP-0008' }).status).toBe(200);
  });

  it('unbegrenzt: 20 Teile per Zaehler und danach ein QR-Teil gehen durch', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({ store: { items_take_unlimited: true }, items: [teil(1)] });
    const res = scan(h, { qr_code: DOOR, items_count: 20 });
    expect(res.status).toBe(200);
    expect(res.body.points).toBe(10 + 20 * 5);
    expect(h.rows('visits')[0].items_count).toBe(20);
    const nochmal = scan(h, { qr_code: DOOR, items_count: 20 });
    expect(nochmal.status).toBe(200);
    expect(nochmal.body.points).toBe(100);
    expect(h.rows('visits')[0].items_count).toBe(40);
    expect(scan(h, { qr_code: 'PP-0001' }).status).toBe(200);
  });

  it('Schalter aus: dieselben 20 Teile werden abgelehnt', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({ store: { items_take_unlimited: false } });
    const err = scanFehler(h, { qr_code: DOOR, items_count: 20 });
    expect(err.status).toBe(400);
    expect(err.message).toBe('Höchstens 7 Teile pro Besuch.');
    expect(h.rows('visits')).toHaveLength(0);
  });

  it('die Rueckfall-Hoechstzahl gilt auch fuer die Tagessumme', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({ store: { max_items_take: 0 } });
    const max = h.lib.DEFAULT_MAX_ITEMS_TAKE;
    expect(max).toBe(7);
    expect(scan(h, { qr_code: DOOR, items_count: max - 1 }).status).toBe(200);
    const err = scanFehler(h, { qr_code: DOOR, items_count: 2 });
    expect(err.status).toBe(400);
    expect(err.message).toBe(`Höchstens ${max} Teile pro Besuch. Heute geht noch 1 Teil.`);
  });

  it('andere Personen zaehlen nicht mit', () => {
    amZeitpunkt(JETZT);
    const h = scanSetup({
      visits: [{ id: 'v9', user: 'andere', checkin_at: iso(new Date(JETZT).getTime() - 3600000), items_count: 7 }],
    });
    expect(scan(h, { qr_code: DOOR, items_count: 7 }).status).toBe(200);
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
      itemsTakeUnlimited: false,
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
      itemsTakeUnlimited: false,
    });
  });

  it('config() nimmt gepflegte Werte ueber 0 unveraendert', () => {
    const h = loadHook('scan.pb.js', {
      store: [{ pts_checkin: 12, pts_take: 3, pts_bring: 8, max_items_take: 4 }],
    });
    expect(h.lib.config()).toEqual({
      checkin: 12,
      takePerItem: 3,
      bringPerItem: 8,
      maxItemsTake: 4,
      itemsTakeUnlimited: false,
    });
  });

  it('config() liefert den Schalter „Unbegrenzt" mit', () => {
    const h = loadHook('scan.pb.js', { store: [{ max_items_take: 4, items_take_unlimited: true }] });
    expect(h.lib.config().itemsTakeUnlimited).toBe(true);
    expect(h.lib.config().maxItemsTake).toBe(4);
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
    h.fireRecordHook('updateRequest', 'items', h.records.teil);
    expect(h.records.person.get('points_total')).toBe(0);
    expect(h.rows('points_log')).toHaveLength(0);
    expect(h.records.teil.get('brought_awarded')).toBe(false);
  });

  it('Gegenprobe: mit Rolle visitor gibt es die Bring-Punkte', () => {
    const h = setup('visitor');
    h.fireRecordHook('updateRequest', 'items', h.records.teil);
    expect(h.records.person.get('points_total')).toBe(5);
    expect(h.records.teil.get('brought_awarded')).toBe(true);
  });
});
