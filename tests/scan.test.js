// Tests für POST /api/pp/scan — den universellen Scanner.
//
// Die Route entscheidet selbst, ob der gescannte Code das Türgeheimnis oder ein
// Teil ist. Hier zählen die Fälle, in denen ein Fehler Punkte falsch vergibt
// oder ein Teil doppelt herausgibt.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// Der Harness ist CommonJS, weil er die Hook-Dateien mit Nodes vm-Modul in
// eine nachgebaute Goja-Umgebung laedt.
const { loadHook } = createRequire(import.meta.url)('./harness.js');

const ROUTE = 'POST /api/pp/scan';
const DOOR = 'geheim-tuer-code';

// Laden in Büsum, Radius per Standardwert 150 m.
const STORE_LAT = 54.1333;
const STORE_LNG = 8.8567;

function setup(overrides = {}) {
  const store = Object.assign(
    {
      __name: 'store',
      checkin_qr_secret: DOOR,
      lat: STORE_LAT,
      lng: STORE_LNG,
      pts_checkin: 10,
      pts_take: 5,
      max_items_take: 7,
    },
    overrides.store || {}
  );

  const user = Object.assign(
    {
      __name: 'user',
      id: 'user1',
      role: 'visitor',
      points_total: 0,
      streak_weeks: 0,
      streak_last_visit: '',
    },
    overrides.user || {}
  );

  return loadHook('scan.pb.js', {
    store: [store],
    users: [user],
    items: overrides.items || [],
    visits: overrides.visits || [],
    points_log: [],
    campaigns: overrides.campaigns || [],
    action_counts: [],
    badges: overrides.badges || [],
    user_badges: [],
  });
}

function auth(h) {
  return h.records.user;
}

describe('Anmeldung und Eingabe', () => {
  it('weist einen Aufruf ohne Anmeldung mit 401 ab', () => {
    const h = setup();
    expect(() => h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: null })).toThrow(
      'Nicht angemeldet'
    );
  });

  it('weist einen leeren QR-Code mit 400 ab', () => {
    const h = setup();
    let err;
    try {
      h.call(ROUTE, { body: { qr_code: '  ' }, authRecord: auth(h) });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(400);
    expect(err.message).toBe('Kein QR-Code');
  });

  it('weist einen unbekannten Code mit 404 ab', () => {
    const h = setup();
    let err;
    try {
      h.call(ROUTE, { body: { qr_code: 'voellig-unbekannt' }, authRecord: auth(h) });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(404);
    expect(err.message).toBe('Unbekannter QR-Code');
  });

  it('erkennt ein falsches Tuergeheimnis nicht als Check-in', () => {
    // Ein abgewandeltes Geheimnis darf keinen Check-in ausloesen. Da es auch
    // kein Teil ist, endet es als unbekannter Code — nicht als Besuch.
    const h = setup();
    let err;
    try {
      h.call(ROUTE, { body: { qr_code: `${DOOR}x` }, authRecord: auth(h) });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(404);
    expect(h.rows('visits')).toHaveLength(0);
    expect(h.records.user.get('points_total')).toBe(0);
  });
});

describe('Geofence', () => {
  it('akzeptiert einen Check-in innerhalb des Radius', () => {
    const h = setup();
    // Rund 60 m noerdlich des Ladens.
    const res = h.call(ROUTE, {
      body: { qr_code: DOOR, gps_lat: STORE_LAT + 0.00054, gps_lng: STORE_LNG },
      authRecord: auth(h),
    });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('checkin');
    expect(h.rows('visits')).toHaveLength(1);
  });

  it('lehnt einen Check-in ausserhalb des Radius ab und legt keinen Besuch an', () => {
    const h = setup();
    // Rund 1,1 km noerdlich — deutlich ausserhalb der 150 m.
    let err;
    try {
      h.call(ROUTE, {
        body: { qr_code: DOOR, gps_lat: STORE_LAT + 0.01, gps_lng: STORE_LNG },
        authRecord: auth(h),
      });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(400);
    expect(err.message).toBe('Du bist nicht im Laden');
    expect(h.rows('visits')).toHaveLength(0);
    expect(h.records.user.get('points_total')).toBe(0);
  });

  it('nutzt den eingestellten Radius statt des Standardwerts', () => {
    // Bei 500 m Radius muss dieselbe Position durchgehen, die bei 150 m
    // abgelehnt wird — sonst wirkt die Einstellung nicht.
    const h = setup({ store: { geofence_radius_m: 500 } });
    const res = h.call(ROUTE, {
      body: { qr_code: DOOR, gps_lat: STORE_LAT + 0.003, gps_lng: STORE_LNG },
      authRecord: auth(h),
    });
    expect(res.status).toBe(200);
    expect(h.rows('visits')).toHaveLength(1);
  });

  it('laesst einen Check-in ohne GPS zu', () => {
    // Ohne Standortfreigabe traegt der Code im Laden die Pruefung.
    const h = setup();
    const res = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });
    expect(res.status).toBe(200);
    expect(h.rows('visits')).toHaveLength(1);
  });

  it('prueft den Geofence auch beim Scannen eines Teils', () => {
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    let err;
    try {
      h.call(ROUTE, {
        body: { qr_code: 'PP-0001', gps_lat: STORE_LAT + 0.01, gps_lng: STORE_LNG },
        authRecord: auth(h),
      });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(400);
    // Das Teil darf dabei nicht als mitgenommen markiert werden.
    expect(h.rows('items')[0].taken_at).toBeUndefined();
  });
});

describe('Punkteberechnung', () => {
  it('schreibt den Besuchsbonus aus der Ladeneinstellung gut', () => {
    const h = setup();
    const res = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });
    expect(res.body.points).toBe(10);
    expect(res.body.points_total).toBe(10);
  });

  it('rechnet mitgenommene Teile mit dem eingestellten Wert', () => {
    // 10 Besuch + 3 Teile a 5 Punkte = 25.
    const h = setup();
    const res = h.call(ROUTE, { body: { qr_code: DOOR, items_count: 3 }, authRecord: auth(h) });
    expect(res.body.points).toBe(25);
    expect(res.body.points_total).toBe(25);
  });

  it('vergibt fuer ein gescanntes Teil dessen Punktwert', () => {
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', size: 'M', points: 30, status: 'approved' }],
    });
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    expect(res.body.type).toBe('item');
    expect(res.body.item_points).toBe(30);
    // Der erste Scan des Tages checkt zugleich ein.
    expect(res.body.checkin_points).toBe(10);
    expect(res.body.did_checkin).toBe(true);
    expect(res.body.points).toBe(40);
    expect(res.body.label).toBe('Jacke, M');
  });

  it('faellt bei einem Teil ohne Punktwert auf 30 zurueck', () => {
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Hose', status: 'approved' }],
    });
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    expect(res.body.item_points).toBe(30);
  });

  it('verdreifacht die Teilepunkte waehrend einer Aktion', () => {
    const now = new Date();
    const gestern = new Date(now.getTime() - 86400000).toISOString();
    const morgen = new Date(now.getTime() + 86400000).toISOString();
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
      campaigns: [
        {
          id: 'camp1',
          name: 'Nachtshopping',
          starts_at: gestern,
          ends_at: morgen,
          multiplier: 1,
          mult_take: 3,
        },
      ],
    });
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    // 30 x 3 = 90 fuer das Teil, der Besuchsbonus bleibt bei 10 (mult_visit ungesetzt).
    expect(res.body.item_points).toBe(90);
    expect(res.body.checkin_points).toBe(10);
  });

  it('rundet das Produkt aus Anzahl, Wert und Faktor einmal', () => {
    // 3 Teile x 5 Punkte x 1,5 = 22,5 -> 23. Pro Teil gerundet waeren es 24.
    const now = new Date();
    const h = setup({
      campaigns: [
        {
          id: 'camp1',
          starts_at: new Date(now.getTime() - 86400000).toISOString(),
          ends_at: new Date(now.getTime() + 86400000).toISOString(),
          multiplier: 1,
          mult_take: 1.5,
        },
      ],
    });
    const res = h.call(ROUTE, { body: { qr_code: DOOR, items_count: 3 }, authRecord: auth(h) });
    expect(res.body.points).toBe(10 + 23);
  });

  it('begrenzt die Anzahl mitgenommener Teile auf das eingestellte Hoechstmass', () => {
    const h = setup();
    let err;
    try {
      h.call(ROUTE, { body: { qr_code: DOOR, items_count: 8 }, authRecord: auth(h) });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(400);
    expect(err.message).toBe('Höchstens 7 Teile pro Besuch.');
    expect(h.rows('visits')).toHaveLength(0);
  });
});

describe('Teile, die nicht mehr zu haben sind', () => {
  it('lehnt ein bereits mitgenommenes Teil mit 409 ab', () => {
    const h = setup({
      items: [
        {
          id: 'item1',
          qr_code: 'PP-0001',
          title: 'Jacke',
          points: 30,
          status: 'approved',
          taken_at: '2026-09-01T10:00:00.000Z',
        },
      ],
    });
    let err;
    try {
      h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(409);
    expect(err.message).toBe('Schon mitgenommen');
    // Keine Punkte, kein Besuch — der Scan bleibt folgenlos.
    expect(h.records.user.get('points_total')).toBe(0);
    expect(h.rows('visits')).toHaveLength(0);
  });

  it('lehnt ein archiviertes Teil mit 410 ab', () => {
    const h = setup({
      items: [
        {
          id: 'item1',
          qr_code: 'PP-0001',
          title: 'Jacke',
          points: 30,
          status: 'approved',
          archived_at: '2026-09-01T10:00:00.000Z',
        },
      ],
    });
    let err;
    try {
      h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(410);
    expect(err.message).toBe('Nicht mehr verfügbar');
    expect(h.records.user.get('points_total')).toBe(0);
  });

  it('lehnt ein noch nicht freigegebenes Teil mit 409 ab', () => {
    // Sonst liesse sich ein selbst eingereichtes Teil vor der Pruefung scannen.
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'pending' }],
    });
    let err;
    try {
      h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(409);
    expect(err.message).toBe('Noch nicht freigegeben');
    expect(h.records.user.get('points_total')).toBe(0);
  });

  it('markiert ein mitgenommenes Teil ohne Verweis auf die Person', () => {
    // Datenschutz: Am Teil darf nicht stehen, wer es geholt hat.
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    const item = h.rows('items')[0];
    expect(item.taken_at).toBeTruthy();
    expect(item.user).toBeUndefined();
    expect(item.taken_by).toBeUndefined();
  });
});

describe('Zweiter Besuch am selben Tag', () => {
  function heute(stunde) {
    const d = new Date();
    d.setHours(stunde, 0, 0, 0);
    return d.toISOString();
  }

  it('vergibt den Besuchsbonus nur einmal taeglich', () => {
    const h = setup({
      visits: [{ id: 'v1', user: 'user1', checkin_at: heute(9) }],
      user: { points_total: 10 },
    });
    const res = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });
    expect(res.body.already_checked_in).toBe(true);
    expect(res.body.points).toBe(0);
    // Kein zweiter Besuch in der Liste.
    expect(h.rows('visits')).toHaveLength(1);
  });

  it('zaehlt beim zweiten Besuch nachgetragene Teile trotzdem', () => {
    const h = setup({
      visits: [{ id: 'v1', user: 'user1', checkin_at: heute(9) }],
    });
    const res = h.call(ROUTE, { body: { qr_code: DOOR, items_count: 2 }, authRecord: auth(h) });
    expect(res.body.already_checked_in).toBe(true);
    expect(res.body.points).toBe(10); // 2 Teile a 5, kein Besuchsbonus
  });

  it('checkt beim Scannen eines Teils nicht erneut ein', () => {
    const h = setup({
      visits: [{ id: 'v1', user: 'user1', checkin_at: heute(9) }],
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    expect(res.body.did_checkin).toBe(false);
    expect(res.body.checkin_points).toBe(0);
    expect(res.body.points).toBe(30);
  });
});

describe('Antwortform', () => {
  // Die Felder sind ein Vertrag gegenueber den Apps auf den Geraeten.
  it('liefert beim Check-in die vereinbarten Felder', () => {
    const h = setup();
    const res = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });
    expect(Object.keys(res.body).sort()).toEqual(
      ['already_checked_in', 'points', 'points_total', 'streak_weeks', 'type'].sort()
    );
  });

  it('liefert beim Teil die vereinbarten Felder', () => {
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    expect(Object.keys(res.body).sort()).toEqual(
      [
        'checkin_points',
        'did_checkin',
        'item_points',
        'label',
        'points',
        'points_total',
        'type',
      ].sort()
    );
  });
});
