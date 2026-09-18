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
      lat: STORE_LAT,
      lng: STORE_LNG,
      pts_checkin: 10,
      pts_take: 5,
      max_items_take: 7,
    },
    overrides.store || {}
  );

  // Das Tuergeheimnis liegt in einer eigenen, gesperrten Sammlung — nicht in
  // `store`, das alle Angemeldeten lesen duerfen.
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

  it('speichert keine Koordinaten, nur den Abstand zum Laden', () => {
    // Datenminimierung: Der Standort dient allein der Pruefung, ob jemand vor
    // Ort ist. Dafuer genuegt der Abstand — die genaue Position gehoert nicht
    // dauerhaft in die Datenbank. Siehe Datenschutzerklaerung.
    const h = setup();
    const res = h.call(ROUTE, {
      body: { qr_code: DOOR, gps_lat: STORE_LAT + 0.00054, gps_lng: STORE_LNG },
      authRecord: auth(h),
    });
    expect(res.status).toBe(200);

    const visit = h.rows('visits')[0];
    expect(visit.gps_lat).toBeUndefined();
    expect(visit.gps_lng).toBeUndefined();
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
    // Wortgleich derselbe Hinweis wie beim Tuercode — so steht er in der
    // API-Beschreibung und so erscheint er in der App.
    expect(err.message).toBe('Du bist nicht im Laden');
    // Das Teil darf dabei nicht als mitgenommen markiert werden.
    expect(h.rows('items')[0].taken_at).toBeUndefined();
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
    // Genau auf dem Rand zaehlt als drinnen, einen Schritt weiter nicht mehr.
    // Ohne diese Probe koennte der Rueckfallwert 150 unbemerkt verrutschen.
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
    // Der Tuer-Zweig behaelt die gemessene Distanz und schreibt sie in den
    // Besuch — beim Zusammenfuehren der Pruefung darf das nicht wegfallen.
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
    // Der Zeitpunkt des Scans, nicht irgendein gesetzter Wert: Ein Hook, der
    // hier "ja" einträgt, käme mit toBeTruthy() durch.
    const gesetzt = Date.parse(item.taken_at);
    expect(Number.isNaN(gesetzt)).toBe(false);
    expect(gesetzt).toBeGreaterThanOrEqual(vorher);
    expect(gesetzt).toBeLessThanOrEqual(nachher);

    expect(item.user).toBeUndefined();
    expect(item.taken_by).toBeUndefined();
  });
});

describe('Zweiter Besuch am selben Tag', () => {
  // Ein frueherer Zeitpunkt am laufenden **Ladentag**.
  //
  // Zwei Fallen stecken hier, beide nur zu bestimmten Uhrzeiten sichtbar:
  //
  //  1. Vorher stand hier eine feste Stunde (`d.setHours(9, ...)`). Zwischen
  //     Mitternacht und 9 Uhr lag der "fruehere Besuch" damit in der Zukunft.
  //  2. Der Ladentag richtet sich nach `Europe/Berlin` (store.timezone), nicht
  //     nach der Zeitzone des Rechners. Wer stattdessen die lokale Mitternacht
  //     nimmt, landet auf einem Laeufer mit anderer Zeitzone — oder in der
  //     Stunde nach Mitternacht Ortszeit — vor dem Ladentagsbeginn, und der
  //     Besuch zaehlt zu gestern.
  //
  // Beides hat in der Nacht zum 19.09.2026 das Test-Gate rot gefaerbt.
  // Deshalb: Tagesbeginn in der Ladenzeitzone bestimmen und den Zeitpunkt
  // sicher dazwischen legen — immer in der Vergangenheit, immer am selben
  // Ladentag, unabhaengig von Uhrzeit und Zeitzone des Laufs.
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
  // Das Geheimnis stand bis zum 14.09.2026 im `store`-Datensatz, den jede
  // Person auch ohne Anmeldung lesen konnte. Es liegt jetzt in einer eigenen,
  // gesperrten Sammlung. Diese Tests halten beide Seiten fest: dass der
  // Scan weiter funktioniert, und dass der Laden das Geheimnis nicht mehr
  // kennt.

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
    // Verbotener Fall: Die Route darf den Code nirgends zurueckspiegeln —
    // weder beim Check-in noch beim Teil.
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });

    const checkin = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });
    expect(JSON.stringify(checkin.body)).not.toContain(DOOR);

    const item = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });
    expect(JSON.stringify(item.body)).not.toContain(DOOR);
  });

  it('nimmt einen Code aus dem Laden-Datensatz nicht mehr als Tuercode an', () => {
    // Verbotener Fall: Wer den alten, oeffentlich abgerufenen Wert kennt und
    // ihn scannt, bekommt keinen Check-in. Das Feld in `store` ist tot.
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
    // Ist die gesperrte Sammlung leer und das Altfeld geraeumt, darf ein
    // leerer Vergleich nicht jeden Code durchwinken.
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
    // Erlaubter Fall: Angemeldete sehen den Laden — Punktwerte und Radius
    // wirken unveraendert, obwohl das Geheimnis ausgezogen ist.
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
  // Die Felder sind ein Vertrag gegenueber den Apps auf den Geraeten.
  //
  // Der Vertrag lautet: Kein Feld verschwindet, keins wechselt den Typ. Ein
  // zusaetzliches Feld ist ausdruecklich erlaubt — eine alte App-Version liest
  // es schlicht nicht. Geprueft wird deshalb, dass jedes vereinbarte Feld da
  // ist und was drinsteht; die Liste als geschlossene Menge zu pruefen wuerde
  // eine erlaubte Ergaenzung als Fehler melden.
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
  // Seit 1782710000_tighten_read_rules.js steht visits.createRule auf null:
  // Kein Konto kann sich mehr Besuche über die REST-API anlegen. Die Regel
  // darf den regulären Weg nicht mit zumachen — doCheckin schreibt über
  // $app.dao(), und der Admin-DAO geht an den Regeln vorbei. Diese Tests
  // sind der erlaubte Fall zum verbotenen in read-rules-migration.test.js.

  // Ein Abzeichen mit dem Auslöser „visits" — genau das, was über den
  // offenen Schreibweg erschleichbar war.
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
    // Der Besuch zählt für das Abzeichen „Stammgast" — genau dafür war der
    // offene Schreibweg missbrauchbar.
    expect(h.lib.computeProgress(h.records.user, h.store.badges[0])).toBe(1);
  });

  it('legt auch beim Scannen eines Teils den fehlenden Besuch an', () => {
    // Wer ein Teil scannt, ohne vorher eingecheckt zu haben, bekommt den
    // Check-in mitgeliefert. Auch dieser Weg läuft über den Admin-DAO.
    const h = setup({
      items: [{ id: 'item1', qr_code: 'PP-0001', title: 'Jacke', points: 30, status: 'approved' }],
    });
    const res = h.call(ROUTE, { body: { qr_code: 'PP-0001' }, authRecord: auth(h) });

    expect(res.body.did_checkin).toBe(true);
    expect(h.rows('visits')).toHaveLength(1);
    expect(h.rows('visits')[0].user).toBe('user1');
  });

  it('zählt am selben Tag keinen zweiten Besuch', () => {
    // Gegenprobe: Der Schreibweg ist offen, aber nicht beliebig. Zwei Scans
    // am selben Tag ergeben einen Besuch, nicht zwei.
    const h = setup({ badges: [STAMMGAST] });
    h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });
    const zweiter = h.call(ROUTE, { body: { qr_code: DOOR }, authRecord: auth(h) });

    expect(zweiter.body.already_checked_in).toBe(true);
    expect(h.rows('visits')).toHaveLength(1);
    expect(h.lib.computeProgress(h.records.user, h.store.badges[0])).toBe(1);
  });
});

// Beim ersten Besuch schaltet oft gleich ein Abzeichen frei. Die Punkte
// dafuer vergibt checkBadges NACH doCheckin — points_total enthaelt sie,
// `points` nicht. Die App meldete „+10 Punkte", der Kontostand sprang um 510.
//
// `points` bleibt, was es ist: die Regel „ausgelieferte Apps nie brechen"
// gilt, Build 33 liest genau dieses Feld und zeigt es an. Ergaenzt wird ein
// ZUSAETZLICHES Feld `bonus_points`, das eine kuenftige Version addieren kann.
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
    // Zweiter Zweig der Route: kein neuer Besuchsbonus, aber Stepper-Punkte —
    // und die koennen ebenfalls ein Abzeichen ausloesen.
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
