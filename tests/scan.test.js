// POST /api/pp/scan: Fälle, in denen Punkte falsch vergeben oder Teile doppelt herausgegeben würden.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// CommonJS, weil der Harness die Hooks per vm in eine Goja-Nachbildung lädt.
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
      lat: STORE_LAT,
      lng: STORE_LNG,
      pts_checkin: 10,
      pts_take: 5,
      max_items_take: 7,
    },
    overrides.store || {}
  );

  // Das Türgeheimnis liegt in einer gesperrten Sammlung, nicht in `store`.
  const secrets =
    overrides.storeSecrets !== undefined
      ? overrides.storeSecrets
      : [{ __name: 'secret', checkin_qr_secret: DOOR }];

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
    store_secrets: secrets,
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

  it('weist einen Superuser mit 401 ab, statt nach seinem Konto zu suchen', () => {
    // Superuser ohne `users`-Konto bekommen 401, nichts wird gebucht.
    const h = setup();
    let err;
    try {
      h.call(ROUTE, { body: { qr_code: DOOR }, admin: { id: 'su1' } });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(401);
    expect(err.message).toBe('Nicht angemeldet');
    expect(h.rows('visits')).toHaveLength(0);
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
    // Ein abgewandeltes Geheimnis endet als unbekannter Code.
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
    // Sonst wirkt die Radius-Einstellung nicht.
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

  it('speichert keine Koordinaten, nur den Abstand zum Laden', () => {
    // Datenminimierung: nur der Abstand wird gespeichert.
    const h = setup();
    const res = h.call(ROUTE, {
      body: { qr_code: DOOR, gps_lat: STORE_LAT + 0.00054, gps_lng: STORE_LNG },
      authRecord: auth(h),
    });
    expect(res.status).toBe(200);

    const visit = h.rows('visits')[0];
    // Leeres Zahlenfeld ist 0, also keine Position.
    expect(visit.gps_lat).toBe(0);
    expect(visit.gps_lng).toBe(0);
    // Der Abstand bleibt erhalten — rund 60 m noerdlich des Ladens.
    expect(visit.gps_distance_m).toBe(60);
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
    // Wortgleich wie in der API-Beschreibung.
    expect(err.message).toBe('Du bist nicht im Laden');
    // Das Teil darf dabei nicht als mitgenommen markiert werden.
    expect(h.rows('items')[0].taken_at).toBe('');
    expect(h.records.user.get('points_total')).toBe(0);
  });

  it('nutzt den eingestellten Radius auch beim Scannen eines Teils', () => {
    // Dieselbe Position, die bei 150 m abgelehnt wird, geht bei 500 m durch.
    const h = setup({
      store: { geofence_radius_m: 500 },
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    const res = h.call(ROUTE, {
      body: { qr_code: 'PP-0001', gps_lat: STORE_LAT + 0.003, gps_lng: STORE_LNG },
      authRecord: auth(h),
    });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('item');
  });

  it('laesst einen Teile-Scan ohne GPS zu', () => {
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('item');
  });

  it('haelt die Grenze auf den Meter genau ein', () => {
    // Der Rand zählt als drinnen, damit der Rückfallwert 150 nicht verrutscht.
    const h = setup();
    const grenze = h.lib.distanceM(STORE_LAT, STORE_LNG, STORE_LAT + 0.0013, STORE_LNG);
    expect(Math.round(grenze)).toBe(145);

    const drinnen = h.call(ROUTE, {
      body: { qr_code: DOOR, gps_lat: STORE_LAT + 0.0013, gps_lng: STORE_LNG },
      authRecord: auth(h),
    });
    expect(drinnen.status).toBe(200);

    const h2 = setup();
    const draussen = h2.lib.distanceM(STORE_LAT, STORE_LNG, STORE_LAT + 0.0014, STORE_LNG);
    expect(Math.round(draussen)).toBe(156);
    let err;
    try {
      h2.call(ROUTE, {
        body: { qr_code: DOOR, gps_lat: STORE_LAT + 0.0014, gps_lng: STORE_LNG },
        authRecord: auth(h2),
      });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(400);
    expect(err.message).toBe('Du bist nicht im Laden');
  });

  it('gibt die Entfernung zurueck und wirft ausserhalb — assertInGeofence', () => {
    // Die gemeinsame Pruefung, die beide Zweige der Route benutzen.
    const h = setup();
    const laden = h.records.store;

    // Ohne Standort gibt es nichts zu pruefen.
    expect(h.lib.assertInGeofence(laden, null, null)).toBe(null);
    expect(h.lib.assertInGeofence(laden, undefined, undefined)).toBe(null);

    // Innerhalb: Entfernung in Metern.
    expect(Math.round(h.lib.assertInGeofence(laden, STORE_LAT + 0.00054, STORE_LNG))).toBe(60);

    // Ausserhalb: 400 mit dem zugesagten Wortlaut.
    let err;
    try {
      h.lib.assertInGeofence(laden, STORE_LAT + 0.01, STORE_LNG);
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(400);
    expect(err.message).toBe('Du bist nicht im Laden');
  });

  it('nimmt ohne gepflegten Radius 150 Meter', () => {
    // Der Rueckfallwert steht nur noch an einer Stelle in lib/points.js.
    const h = setup();
    expect(h.lib.DEFAULT_GEOFENCE_RADIUS_M).toBe(150);
    expect(h.records.store.get('geofence_radius_m')).toBe(0); // nichts gepflegt
    expect(Math.round(h.lib.assertInGeofence(h.records.store, STORE_LAT + 0.0013, STORE_LNG))).toBe(145);
    expect(() => h.lib.assertInGeofence(h.records.store, STORE_LAT + 0.0014, STORE_LNG)).toThrow(
      'Du bist nicht im Laden'
    );
  });

  it('haelt die Entfernung im Besuch fest', () => {
    // Die Distanz darf beim Zusammenführen nicht wegfallen.
    const h = setup();
    h.call(ROUTE, {
      body: { qr_code: DOOR, gps_lat: STORE_LAT + 0.00054, gps_lng: STORE_LNG },
      authRecord: auth(h),
    });
    const besuch = h.rows('visits')[0];
    expect(besuch.gps_distance_m).toBe(60);
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
    const vorher = Date.now();
    h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    const nachher = Date.now();

    const item = h.rows('items')[0];
    // Der Zeitpunkt, sonst käme ein beliebiger Wert durch.
    const gesetzt = Date.parse(item.taken_at);
    expect(Number.isNaN(gesetzt)).toBe(false);
    expect(gesetzt).toBeGreaterThanOrEqual(vorher);
    expect(gesetzt).toBeLessThanOrEqual(nachher);

    expect(item.user).toBeUndefined();
    expect(item.taken_by).toBeUndefined();
  });
});

describe('Zweiter Besuch am selben Tag', () => {
  // Früherer Zeitpunkt am laufenden Ladentag in Europe/Berlin, unabhängig von Uhrzeit und Zeitzone des Laufs.
  const LADEN_TZ = 'Europe/Berlin';

  function ladenTagesbeginn(jetzt) {
    const teile = new Intl.DateTimeFormat('en-CA', {
      timeZone: LADEN_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(jetzt).reduce((a, t) => ((a[t.type] = t.value), a), {});
    // Wie viel Zeit ist am Ladentag schon vergangen?
    const seitMitternacht =
      (+teile.hour * 3600 + +teile.minute * 60 + +teile.second) * 1000;
    return new Date(jetzt.getTime() - seitMitternacht);
  }

  function vorhin(stundenZurueck = 1) {
    const jetzt = new Date();
    const beginn = ladenTagesbeginn(jetzt);
    const gewuenscht = jetzt.getTime() - stundenZurueck * 3600_000;
    // Nicht vor den Ladentagsbeginn rutschen, aber auch nicht in die Zukunft.
    const ms = Math.min(
      Math.max(gewuenscht, beginn.getTime() + 60_000),
      jetzt.getTime() - 1000,
    );
    return new Date(ms).toISOString();
  }

  it('vergibt den Besuchsbonus nur einmal taeglich', () => {
    const h = setup({
      visits: [{ id: 'v1', user: 'user1', checkin_at: vorhin() }],
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
      visits: [{ id: 'v1', user: 'user1', checkin_at: vorhin() }],
    });
    const res = h.call(ROUTE, { body: { qr_code: DOOR, items_count: 2 }, authRecord: auth(h) });
    expect(res.body.already_checked_in).toBe(true);
    expect(res.body.points).toBe(10); // 2 Teile a 5, kein Besuchsbonus
  });

  it('checkt beim Scannen eines Teils nicht erneut ein', () => {
    const h = setup({
      visits: [{ id: 'v1', user: 'user1', checkin_at: vorhin() }],
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    expect(res.body.did_checkin).toBe(false);
    expect(res.body.checkin_points).toBe(0);
    expect(res.body.points).toBe(30);
  });
});

describe('Tuergeheimnis liegt getrennt vom Laden', () => {
  // Der Scan funktioniert weiter, und `store` kennt das Geheimnis nicht mehr.

  it('erkennt den Tuercode aus der gesperrten Sammlung', () => {
    // Erlaubter Fall: Das Geheimnis steht ausschliesslich in store_secrets.
    const h = setup();
    expect(h.records.store.get('checkin_qr_secret')).toBe('');

    const res = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('checkin');
    expect(res.body.points).toBe(10);
    expect(h.rows('visits')).toHaveLength(1);
  });

  it('gibt das Geheimnis in keiner Antwort heraus', () => {
    // Verboten: den Code zurückspiegeln.
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });

    const checkin = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });
    expect(JSON.stringify(checkin.body)).not.toContain(DOOR);

    const item = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    expect(JSON.stringify(item.body)).not.toContain(DOOR);
  });

  it('nimmt einen Code aus dem Laden-Datensatz nicht mehr als Tuercode an', () => {
    // Verboten: der alte öffentliche Wert gibt keinen Check-in.
    const h = setup({
      store: { checkin_qr_secret: 'alter-oeffentlicher-code' },
      storeSecrets: [{ checkin_qr_secret: DOOR }],
    });

    let err;
    try {
      h.call(ROUTE, { body: { qr_code: 'alter-oeffentlicher-code' }, authRecord: auth(h) });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(404);
    expect(err.message).toBe('Unbekannter QR-Code');
    expect(h.rows('visits')).toHaveLength(0);
    expect(h.records.user.get('points_total')).toBe(0);
  });

  it('laesst ein leeres Geheimnis keinen beliebigen Code zum Tuercode machen', () => {
    // Ein leerer Vergleich darf nicht jeden Code durchwinken.
    const h = setup({ storeSecrets: [] });

    let err;
    try {
      h.call(ROUTE, { body: { qr_code: 'irgendwas' }, authRecord: auth(h) });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(404);
    expect(h.rows('visits')).toHaveLength(0);
  });

  it('liest den Laden weiterhin fuer Punktwerte und Geofence', () => {
    // Erlaubt: Punktwerte und Radius wirken unverändert.
    const h = setup({ store: { pts_checkin: 25, pts_take: 4, geofence_radius_m: 500 } });

    const res = h.call(ROUTE, {
      body: { qr_code: DOOR, items_count: 2, gps_lat: STORE_LAT + 0.003, gps_lng: STORE_LNG },
      authRecord: auth(h),
    });
    expect(res.status).toBe(200);
    expect(res.body.points).toBe(33); // 25 Besuch + 2 Teile a 4
    expect(res.body.points_total).toBe(33);
  });

  it('weist ausserhalb des Radius weiterhin ab', () => {
    const h = setup({ store: { geofence_radius_m: 100 } });
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
  });
});

describe('Antwortform', () => {
  // Vertrag mit den Apps: kein Feld verschwindet oder wechselt den Typ, neue sind erlaubt.
  const CHECKIN_FELDER = ['already_checked_in', 'points', 'points_total', 'streak_weeks', 'type'];
  const TEIL_FELDER = [
    'checkin_points',
    'did_checkin',
    'item_points',
    'label',
    'points',
    'points_total',
    'type',
  ];

  it('liefert beim Check-in die vereinbarten Felder', () => {
    const h = setup();
    const res = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });
    for (const feld of CHECKIN_FELDER) {
      expect(Object.keys(res.body)).toContain(feld);
    }
    // Und die Typen, die die App erwartet.
    expect(res.body.type).toBe('checkin');
    expect(res.body.already_checked_in).toBe(false);
    expect(res.body.points).toBe(10);
    expect(res.body.points_total).toBe(10);
    expect(res.body.streak_weeks).toBe(1);
  });

  it('liefert beim Teil die vereinbarten Felder', () => {
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    for (const feld of TEIL_FELDER) {
      expect(Object.keys(res.body)).toContain(feld);
    }
    expect(res.body.type).toBe('item');
    expect(res.body.label).toBe('Jacke');
    expect(res.body.points).toBe(40);
    expect(res.body.item_points).toBe(30);
    expect(res.body.checkin_points).toBe(10);
    expect(res.body.did_checkin).toBe(true);
    expect(res.body.points_total).toBe(40);
  });
});

describe('Besuche entstehen serverseitig', () => {
  // Der erlaubte Fall zu visits.createRule = null: doCheckin schreibt an den Regeln vorbei.

  const STAMMGAST = { id: 'b_stammgast', trigger_type: 'visits' };

  it('legt beim Türcode einen vollständigen Besuch an', () => {
    const h = setup({ badges: [STAMMGAST] });
    const res = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });

    expect(res.status).toBe(200);
    expect(h.rows('visits')).toHaveLength(1);
    const besuch = h.rows('visits')[0];
    expect(besuch.user).toBe('user1');
    expect(besuch.items_count).toBe(0);
    expect(besuch.points_awarded).toBe(10);
    expect(h.lib.computeProgress(h.records.user, h.store.badges[0])).toBe(1);
  });

  it('legt auch beim Scannen eines Teils den fehlenden Besuch an', () => {
    // Ein Teil-Scan ohne Check-in bringt den Check-in mit.
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });

    expect(res.body.did_checkin).toBe(true);
    expect(h.rows('visits')).toHaveLength(1);
    expect(h.rows('visits')[0].user).toBe('user1');
  });

  it('zählt am selben Tag keinen zweiten Besuch', () => {
    // Zwei Scans am selben Tag ergeben einen Besuch.
    const h = setup({ badges: [STAMMGAST] });
    h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });
    const zweiter = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });

    expect(zweiter.body.already_checked_in).toBe(true);
    expect(h.rows('visits')).toHaveLength(1);
    expect(h.lib.computeProgress(h.records.user, h.store.badges[0])).toBe(1);
  });
});

// `bonus_points` zusätzlich, `points` bleibt für ausgelieferte Apps.
describe('Punkte aus Abzeichen in der Antwort', () => {
  // Ein Abzeichen, das beim ersten Besuch sofort Bronze erreicht.
  const ERSTER_BESUCH = {
    id: 'b1',
    name: 'Erster Besuch',
    kind: 'tiered',
    trigger_type: 'visits',
    tier_bronze: 1,
    reward_bronze: 500,
  };

  it('weist die Abzeichen-Punkte beim Check-in getrennt aus', () => {
    const h = setup({ badges: [ERSTER_BESUCH] });
    const res = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });

    // Unveraendert: das Feld, das die ausgelieferte App liest.
    expect(res.body.points).toBe(10);
    // Neu: der Bonus, der sonst nur im Kontostand auftauchte.
    expect(res.body.bonus_points).toBe(500);
    // Und die Probe, dass beides zusammen den Kontostand ergibt.
    expect(res.body.points_total).toBe(510);
    expect(res.body.points + res.body.bonus_points).toBe(res.body.points_total);
  });

  it('meldet ohne freigeschaltetes Abzeichen einen Bonus von 0', () => {
    const h = setup();
    const res = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });
    expect(res.body.points).toBe(10);
    expect(res.body.bonus_points).toBe(0);
    expect(res.body.points_total).toBe(10);
  });

  it('weist die Abzeichen-Punkte auch beim Scannen eines Teils aus', () => {
    const h = setup({
      badges: [ERSTER_BESUCH],
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });

    // Teil (30) + mitgelieferter Check-in (10) — unveraendert.
    expect(res.body.points).toBe(40);
    expect(res.body.item_points).toBe(30);
    expect(res.body.checkin_points).toBe(10);
    expect(res.body.bonus_points).toBe(500);
    expect(res.body.points_total).toBe(540);
  });

  it('weist den Bonus auch beim zweiten Check-in am selben Tag aus', () => {
    // Auch Stepper-Punkte können ein Abzeichen auslösen.
    const SAMMLER = {
      id: 'b2',
      name: 'Sammler',
      kind: 'tiered',
      trigger_type: 'scans',
      tier_bronze: 1,
      reward_bronze: 100,
    };
    const h = setup({
      badges: [SAMMLER],
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    // Erster Scan: legt den Besuch an und loest das Abzeichen aus.
    h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    // Zweiter Aufruf am selben Tag ueber die Tuer, mit Stepper.
    const res = h.call(ROUTE, { body: { qr_code: DOOR, items_count: 2 }, authRecord: auth(h) });

    expect(res.body.already_checked_in).toBe(true);
    expect(res.body.points).toBe(10); // 2 Teile à 5
    // Das Abzeichen war schon vergeben, es kommt nichts mehr dazu.
    expect(res.body.bonus_points).toBe(0);
  });

  it('laesst die uebrigen Felder der Antwort unveraendert', () => {
    // Die Antwortform ist ein Vertrag: Es darf nur etwas dazukommen.
    const h = setup({ badges: [ERSTER_BESUCH] });
    const res = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });
    expect(Object.keys(res.body).sort()).toEqual([
      'already_checked_in',
      'bonus_points',
      'points',
      'points_total',
      'streak_weeks',
      'type',
    ]);
    expect(res.body.type).toBe('checkin');
    expect(res.body.already_checked_in).toBe(false);
    expect(res.body.streak_weeks).toBe(1);
  });

  it('laesst die Felder der Teil-Antwort unveraendert', () => {
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', size: 'M', points: 30, status: 'approved' }],
    });
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    expect(Object.keys(res.body).sort()).toEqual([
      'bonus_points',
      'checkin_points',
      'did_checkin',
      'item_points',
      'label',
      'points',
      'points_total',
      'type',
    ]);
    expect(res.body.label).toBe('Jacke, M');
  });
});

describe('Teilschreibung: das Teil laesst sich nicht als mitgenommen speichern', () => {
  // Der Scan läuft in einer Transaktion: scheitert ein Schritt, wird nichts gebucht.
  const TEIL = { id: 'item1', sku: 'PP-0001', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' };

  it('bucht nichts, laesst das Teil offen und zahlt beim zweiten Scan genau einmal', () => {
    const h = setup({ items: [TEIL] });
    const aus = h.failSaveOn('items', (r) => r.get('taken_at') !== '', 'database is locked');

    expect(() => h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) })).toThrow(
      'database is locked'
    );

    expect(h.rows('visits')).toHaveLength(0);
    expect(h.rows('points_log')).toEqual([]);
    expect(h.records.user.get('points_total')).toBe(0);
    expect(h.records.user.get('streak_weeks')).toBe(0);
    expect(h.rows('items')[0].taken_at).toBe('');

    // Der zweite Versuch ist wieder der erste Scan des Tages.
    aus();
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    expect(res.status).toBe(200);
    expect(res.body.item_points).toBe(30);
    expect(res.body.checkin_points).toBe(10);
    expect(res.body.did_checkin).toBe(true);
    expect(res.body.points_total).toBe(40);

    // Ein Teil, einmal bezahlt.
    expect(h.rows('visits')).toHaveLength(1);
    expect(h.rows('points_log').map((p) => [p.kind, p.points])).toEqual([
      ['checkin', 10],
      ['scan', 30],
    ]);
    expect(h.records.user.get('points_total')).toBe(40);
    expect(h.rows('items')[0].taken_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('meldet einen Fehler mit Status unveraendert, auch wenn er in der Transaktion faellt', () => {
    // Abweisungen kommen mit ihrem Status an und hinterlassen nichts.
    const h = setup({ items: [TEIL] });
    let err;
    try {
      h.call(ROUTE, { body: { qr_code: 'PP-0001', gps_lat: STORE_LAT + 0.01, gps_lng: STORE_LNG }, authRecord: auth(h) });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(400);
    expect(err.message).toBe('Du bist nicht im Laden');
    expect(h.rows('visits')).toHaveLength(0);
    expect(h.rows('points_log')).toEqual([]);
  });

  it('schickt die Check-in-Bestaetigung erst nach dem Festschreiben', () => {
    // Push nur bei festgeschriebener Buchung, genau einmal.
    const h = loadHook(
      'scan.pb.js',
      {
        store: [{ lat: STORE_LAT, lng: STORE_LNG, pts_checkin: 10, pts_take: 5, max_items_take: 7 }],
        store_secrets: [{ checkin_qr_secret: DOOR }],
        users: [{ __name: 'user', id: 'user1', role: 'visitor', push_streak_enabled: true }],
        push_devices: [{ id: 'dev1', user: 'user1', expo_token: 'ExponentPushToken[abc]', platform: 'ios' }],
        items: [TEIL],
        visits: [],
        points_log: [],
        campaigns: [],
        action_counts: [],
        badges: [],
        user_badges: [],
      },
      { realPush: true }
    );
    const aus = h.failSaveOn('items', (r) => r.get('taken_at') !== '', 'database is locked');
    expect(() => h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) })).toThrow(
      'database is locked'
    );
    expect(h.httpCalls).toHaveLength(0);

    aus();
    h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    expect(h.httpCalls).toHaveLength(1);
    const nachricht = JSON.parse(h.httpCalls[0].body);
    expect(nachricht.map((m) => [m.to, m.body])).toEqual([['ExponentPushToken[abc]', '10 Punkte gutgeschrieben.']]);
  });
});
