// Höchstzahl mitgenommener Teile pro Besuch, gegen das echte PocketBase 0.40.
//
// Entscheidung des Betreibers (26.09.2026): Die Grenze gilt pro Tag in der
// Ladenzeitzone, über alle Scans — Zähler an der Tür (auch beim zweiten
// Tür-Scan) und per QR gescannte Teile. Mit dem Schalter „Unbegrenzt"
// (store.items_take_unlimited) gibt es keine Grenze.
//
// Geprüft wird der Weg der App: Scan mit dem SDK 0.22.1, Schalter umlegen
// über ein Team-Konto mit Rolle admin, wie der Admin-Screen es tut. Dass bei
// einer Ablehnung nichts gebucht ist, liest der Superuser an den Regeln
// vorbei nach — so wirkt die echte Transaktion, nicht die des Harness.
//
// Die Datei legt den Schalter am Ende wieder auf aus: Alle Integrationstests
// teilen sich eine Instanz.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminList, registerAndLogin, createTeamUser } from './helpers.mjs';

const scan = (pb, body) => pb.send('/api/pp/scan', { method: 'POST', body });

async function fehler(promise) {
  try {
    await promise;
  } catch (e) {
    return { status: e.status, message: e.response?.message };
  }
  throw new Error('Aufruf hätte fehlschlagen müssen');
}

let store;
let doorSecret;
let team;
let ort;

beforeAll(async () => {
  [store] = await adminList('store');
  [{ checkin_qr_secret: doorSecret }] = await adminList('store_secrets');
  team = await createTeamUser('obergrenze-team');
  ort = { gps_lat: store.lat, gps_lng: store.lng };
});

afterAll(async () => {
  await team.pb.collection('store').update(store.id, { items_take_unlimited: false });
});

describe('Höchstzahl pro Tag über alle Scans', () => {
  it('bringt das neue Feld mit der Vorgabe aus mit, Grenze 7', () => {
    expect(store.items_take_unlimited).toBe(false);
    expect(store.max_items_take).toBe(7);
  });

  it('Tür mit 5 Teilen, erneuter Tür-Scan mit 3 Teilen: 400, nichts gebucht', async () => {
    const anna = await registerAndLogin('obergrenze-anna');
    const erster = await scan(anna.pb, { qr_code: doorSecret, ...ort });
    expect(erster.already_checked_in).toBe(false);
    const zaehler = await scan(anna.pb, { qr_code: doorSecret, items_count: 5, ...ort });
    expect(zaehler.already_checked_in).toBe(true);
    expect(zaehler.points).toBe(25);
    expect(zaehler.points_total).toBe(35);

    const logVorher = await adminList('points_log', `user = "${anna.id}"`);

    const err = await fehler(scan(anna.pb, { qr_code: doorSecret, items_count: 3, ...ort }));
    expect(err.status).toBe(400);
    expect(err.message).toBe('Höchstens 7 Teile pro Besuch. Heute gehen noch 2 Teile.');

    const logNachher = await adminList('points_log', `user = "${anna.id}"`);
    expect(logNachher).toHaveLength(logVorher.length);
    const [ich] = await adminList('users', `id = "${anna.id}"`);
    expect(ich.points_total).toBe(35);
    const besuche = await adminList('visits', `user = "${anna.id}"`);
    expect(besuche).toHaveLength(1);
    expect(besuche[0].items_count).toBe(5);

    // Genau bis zur Grenze geht es noch.
    const rest = await scan(anna.pb, { qr_code: doorSecret, items_count: 2, ...ort });
    expect(rest.points).toBe(10);
  });

  it('ein QR-Teil als 8. Teil des Tages: 400, das Teil bleibt offen', async () => {
    const item = await team.pb.collection('items').create({ title: 'Mütze', stays_external: false });
    const ben = await registerAndLogin('obergrenze-ben');
    await scan(ben.pb, { qr_code: doorSecret, items_count: 7, ...ort });

    const err = await fehler(scan(ben.pb, { qr_code: item.qr_code, ...ort }));
    expect(err.status).toBe(400);
    expect(err.message).toBe('Höchstens 7 Teile pro Besuch. Für heute ist die Grenze erreicht.');
    const [teil] = await adminList('items', `id = "${item.id}"`);
    expect(teil.taken_at).toBe('');
  });

  it('mit „Unbegrenzt" geht derselbe zweite Tür-Scan durch: 200', async () => {
    await team.pb.collection('store').update(store.id, { items_take_unlimited: true });
    const [neu] = await adminList('store');
    expect(neu.items_take_unlimited).toBe(true);

    const carla = await registerAndLogin('obergrenze-carla');
    await scan(carla.pb, { qr_code: doorSecret, ...ort });
    await scan(carla.pb, { qr_code: doorSecret, items_count: 5, ...ort });
    const res = await scan(carla.pb, { qr_code: doorSecret, items_count: 3, ...ort });
    expect(res.points).toBe(15);
    const viele = await scan(carla.pb, { qr_code: doorSecret, items_count: 20, ...ort });
    expect(viele.points).toBe(100);
    const besuche = await adminList('visits', `user = "${carla.id}"`);
    expect(besuche[0].items_count).toBe(28);
  });

  it('ein Konto ohne Rolle admin kann den Schalter nicht umlegen', async () => {
    const dora = await registerAndLogin('obergrenze-dora');
    let status = null;
    try {
      await dora.pb.collection('store').update(store.id, { items_take_unlimited: false });
    } catch (e) {
      status = e.status;
    }
    expect(status).toBe(404);
    const [s] = await adminList('store');
    expect(s.items_take_unlimited).toBe(true);
  });
});
