// Der Weg der App, gegen das echte PocketBase 0.40 — mit dem SDK in der
// Version, die in den ausgelieferten Apps steckt (0.22.1).
//
// Die Antwortformen der eigenen Routen werden auf die EXAKTE Schlüsselmenge
// geprüft. Das ist der Vertrag mit den Apps auf den Geräten: Ein Feld, das
// verschwindet oder umbenannt wird, bricht eine App, die sich nicht
// mitdeployen lässt (siehe CLAUDE.md, „Ausgelieferte Apps nie brechen").
// Ein neues Feld dagegen wäre erlaubt — schlägt ein Test nur deshalb fehl,
// die Liste hier bewusst erweitern und docs/openapi.yaml mitziehen.
//
// Die Formen stammen aus docs/openapi.yaml (CheckinResult, ItemResult, Ok).

import { describe, it, expect, beforeAll } from 'vitest';
import {
  call,
  client,
  adminList,
  registerAndLogin,
  createTeamUser,
  uniqueEmail,
  sortedKeys,
} from './helpers.mjs';

const CHECKIN_KEYS = ['already_checked_in', 'bonus_points', 'points', 'points_total', 'streak_weeks', 'type'];
const ITEM_KEYS = ['bonus_points', 'checkin_points', 'did_checkin', 'item_points', 'label', 'points', 'points_total', 'type'];

// Das SDK wirft bei Fehlern einen ClientResponseError. Die App liest daraus
// `status` und `response.message` (mobile/lib/errors.ts) — genau das prüfen
// wir auch.
async function fehler(promise) {
  try {
    await promise;
  } catch (e) {
    return { status: e.status, message: e.response?.message, data: e.response?.data };
  }
  throw new Error('Aufruf hätte fehlschlagen müssen');
}

// PocketBase ab 0.23 macht aus jeder ApiError-Meldung einen Satz: großer
// Anfangsbuchstabe, Punkt am Ende. Aus throw new ApiError(400, 'Du bist nicht
// im Laden') wird in der Antwort „Du bist nicht im Laden." — gemessen am
// 26.09.2026 gegen 0.40.4, der Hook-Quelltext hat keinen Punkt. Die App zeigt
// den Text wörtlich (mobile/lib/errors.ts); ihre Deutsch-Erkennung trifft
// weiterhin. Geprüft wird deshalb der Text, der wirklich ankommt.
const scan = (pb, body) => pb.send('/api/pp/scan', { method: 'POST', body });

let store;
let doorSecret;

beforeAll(async () => {
  [store] = await adminList('store');
  [{ checkin_qr_secret: doorSecret }] = await adminList('store_secrets');
});

describe('Registrierung und Anmeldung', () => {
  it('legt ein Konto als visitor an', async () => {
    const pb = client();
    const email = uniqueEmail('anna');
    const rec = await pb.collection('users').create({
      email,
      password: 'Passwort-123',
      passwordConfirm: 'Passwort-123',
      name: 'Anna',
      role: 'visitor',
    });
    expect(rec.role).toBe('visitor');
    expect(rec.points_total).toBe(0);
    expect(rec.streak_weeks).toBe(0);
  });

  it('macht aus role=admin bei der Selbstregistrierung einen visitor', async () => {
    const pb = client();
    const email = uniqueEmail('mallory');
    const rec = await pb.collection('users').create({
      email,
      password: 'Passwort-123',
      passwordConfirm: 'Passwort-123',
      name: 'Mallory',
      role: 'admin',
      points_total: 99999,
    });
    expect(rec.role).toBe('visitor');
    expect(rec.points_total).toBe(0);
  });

  it('meldet eine doppelte Adresse am Feld email (register.tsx liest data.email)', async () => {
    const { email } = await registerAndLogin('doppelt');
    const err = await fehler(
      client().collection('users').create({
        email,
        password: 'Passwort-123',
        passwordConfirm: 'Passwort-123',
        role: 'visitor',
      })
    );
    expect(err.status).toBe(400);
    expect(Object.keys(err.data)).toEqual(['email']);
  });

  it('meldet an und liefert Token und eigenen Datensatz', async () => {
    const { pb, email } = await registerAndLogin('login');
    expect(pb.authStore.isValid).toBe(true);
    expect(pb.authStore.model.email).toBe(email);
    expect(pb.authStore.model.role).toBe('visitor');
  });

  it('lehnt ein falsches Passwort mit 400 ab', async () => {
    const { email } = await registerAndLogin('falsch');
    const err = await fehler(client().collection('users').authWithPassword(email, 'nicht-das-passwort'));
    expect(err.status).toBe(400);
  });
});

describe('POST /api/pp/scan — Tür', () => {
  let anna;

  beforeAll(async () => {
    anna = await registerAndLogin('tuer');
  });

  it('lehnt ohne Anmeldung mit 401 ab', async () => {
    const res = await call('POST', '/api/pp/scan', { body: { qr_code: doorSecret } });
    expect(res.status).toBe(401);
  });

  it('lehnt außerhalb des Geofence mit „Du bist nicht im Laden" ab', async () => {
    const err = await fehler(scan(anna.pb, { qr_code: doorSecret, gps_lat: store.lat + 0.01, gps_lng: store.lng }));
    expect(err.status).toBe(400);
    expect(err.message).toBe('Du bist nicht im Laden.');
  });

  it('checkt am Ladenstandort ein: 200, exakte Form, 10 Punkte', async () => {
    const res = await scan(anna.pb, { qr_code: doorSecret, gps_lat: store.lat, gps_lng: store.lng });
    expect(sortedKeys(res)).toEqual(CHECKIN_KEYS);
    expect(res).toEqual({
      type: 'checkin',
      already_checked_in: false,
      points: 10,
      bonus_points: 0,
      points_total: 10,
      streak_weeks: 1,
    });
  });

  it('zählt den zweiten Scan am selben Tag nicht noch einmal', async () => {
    const res = await scan(anna.pb, { qr_code: doorSecret, gps_lat: store.lat, gps_lng: store.lng });
    expect(sortedKeys(res)).toEqual(CHECKIN_KEYS);
    expect(res).toEqual({
      type: 'checkin',
      already_checked_in: true,
      points: 0,
      bonus_points: 0,
      points_total: 10,
      streak_weeks: 1,
    });
  });

  it('hat genau einen Besuch gespeichert', async () => {
    const visits = await adminList('visits', `user = "${anna.id}"`);
    expect(visits).toHaveLength(1);
  });
});

describe('POST /api/pp/scan — Teil', () => {
  let team;
  let holer;
  let zweite;
  let item;

  beforeAll(async () => {
    team = await createTeamUser('team');
    item = await team.pb.collection('items').create({ title: 'Jacke', size: 'M', stays_external: false, is_showcase: true });
    holer = await registerAndLogin('holer');
    zweite = await registerAndLogin('zweite');
  });

  it('vergibt beim Anlegen durchs Team SKU, QR-Code und Freigabe', () => {
    expect(item.sku).toMatch(/^PP-\d{4}$/);
    expect(item.qr_code).toBe(item.sku);
    expect(item.status).toBe('approved');
    expect(item.points).toBe(30);
  });

  it('zeigt das Teil in der Ladenliste mit dem Filter der App', async () => {
    const res = await holer.pb.collection('items').getList(1, 50, {
      filter: 'status = "approved" && taken_at = null && archived_at = null',
    });
    expect(res.items.map((i) => i.id)).toContain(item.id);
  });

  it('nimmt das Teil mit: 200, exakte Form, zugleich erster Besuch des Tages', async () => {
    const res = await scan(holer.pb, { qr_code: item.qr_code, gps_lat: store.lat, gps_lng: store.lng });
    expect(sortedKeys(res)).toEqual(ITEM_KEYS);
    expect(res).toEqual({
      type: 'item',
      label: 'Jacke, M',
      points: 40,
      item_points: 30,
      checkin_points: 10,
      bonus_points: 0,
      did_checkin: true,
      points_total: 40,
    });
  });

  it('meldet ein schon mitgenommenes Teil mit 409 „Schon mitgenommen"', async () => {
    const err = await fehler(scan(zweite.pb, { qr_code: item.qr_code, gps_lat: store.lat, gps_lng: store.lng }));
    expect(err.status).toBe(409);
    expect(err.message).toBe('Schon mitgenommen.');
  });

  it('nimmt das mitgenommene Teil aus der Ladenliste', async () => {
    const res = await holer.pb.collection('items').getList(1, 50, {
      filter: 'status = "approved" && taken_at = null && archived_at = null',
    });
    expect(res.items.map((i) => i.id)).not.toContain(item.id);
  });

  it('meldet einen unbekannten Code mit 404', async () => {
    const err = await fehler(scan(zweite.pb, { qr_code: 'PP-9999', gps_lat: store.lat, gps_lng: store.lng }));
    expect(err.status).toBe(404);
    expect(err.message).toBe('Unbekannter QR-Code.');
  });
});

describe('POST /api/pp/push/register und /unregister', () => {
  let anna;
  const token = 'ExponentPushToken[integration-abc_123]';

  beforeAll(async () => {
    anna = await registerAndLogin('push');
  });

  it('meldet ein Gerät an: 200 { ok: true }', async () => {
    const res = await anna.pb.send('/api/pp/push/register', {
      method: 'POST',
      body: { expo_token: token, platform: 'android' },
    });
    expect(res).toEqual({ ok: true });
    const rows = await adminList('push_devices', `expo_token = "${token}"`);
    expect(rows.map((r) => [r.user, r.platform])).toEqual([[anna.id, 'android']]);
  });

  it('weist einen Token mit Anführungszeichen (Filter-Injektion) mit 400 ab', async () => {
    const err = await fehler(
      anna.pb.send('/api/pp/push/register', {
        method: 'POST',
        body: { expo_token: 'ExponentPushToken[x" || user != "]' },
      })
    );
    expect(err.status).toBe(400);
    expect(err.message).toBe('Ungueltiger Token.');
  });

  it('meldet das Gerät wieder ab: 200 { ok: true }, Eintrag weg', async () => {
    const res = await anna.pb.send('/api/pp/push/unregister', {
      method: 'POST',
      body: { expo_token: token },
    });
    expect(res).toEqual({ ok: true });
    const rows = await adminList('push_devices', `expo_token = "${token}"`);
    expect(rows).toEqual([]);
  });

  it('lehnt ohne Anmeldung mit 401 ab', async () => {
    const res = await call('POST', '/api/pp/push/register', { body: { expo_token: token } });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/pp/version', () => {
  // Die Route ist am 02.10.2026 gegen 0.22 entstanden und beim Upgrade auf
  // die 0.40-Schnittstelle umgeschrieben worden (e statt c). Der Harness kann
  // nicht zeigen, ob der Handler unter dem echten Binary läuft — etwa ob
  // require() mit __hooks im Handler-Scope greift. Hier läuft er wirklich.
  it('antwortet ohne Anmeldung mit genau { commit }', async () => {
    const res = await call('GET', '/api/pp/version');
    expect(res.status).toBe(200);
    expect(sortedKeys(res.body)).toEqual(['commit']);
  });

  it('meldet einen leeren Commit, wenn lib/build.js fehlt (Hooks aus dem Repo)', async () => {
    const res = await call('GET', '/api/pp/version');
    expect(res.body.commit).toBe('');
  });
});
