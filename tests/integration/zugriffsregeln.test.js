// Die Sicherheitszusagen der Zugriffsregeln, gegen das echte PocketBase 0.40
// über HTTP — je Zusage ein verbotener und ein erlaubter Fall.
//
// Die Unit-Ebene (tests/zugriffsregeln.test.js) prüft den Wortlaut der Regeln
// im Snapshot und wertet sie selbst aus. Hier zählt, was PocketBase daraus
// macht. Die Statuscodes sind gemessen (26.09.2026, 0.40.4):
//   - Regel null (nur Superuser): 403 für list, view und create — auch ohne
//     Anmeldung, Meldung „Only superusers can perform this action."
//   - Regel greift nicht beim Listen: 200 mit leerer Liste.
//   - Regel greift nicht beim Einzelabruf: 404, nicht 403 — PocketBase
//     verrät nicht, ob es den Datensatz gibt.
//
// Die Konten werden mit dem SDK der ausgelieferten Apps angelegt (0.22.1),
// die Datensätze, die nur Hooks oder der Superuser schreiben (visits,
// points_log, action_counts), legt der Superuser an.

import { describe, it, expect, beforeAll } from 'vitest';
import { call, superuserToken, adminList, registerAndLogin } from './helpers.mjs';

const NUR_SUPERUSER = { status: 403, message: 'Only superusers can perform this action.' };

const tokenVon = (konto) => konto.pb.authStore.token;
const kurz = (res) => ({ status: res.status, message: res.body && res.body.message });

async function alsSuperuserAnlegen(sammlung, body) {
  const res = await call('POST', `/api/collections/${sammlung}/records`, { token: await superuserToken(), body });
  if (res.status !== 200) throw new Error(`${sammlung} anlegen: HTTP ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

let anna; // Besucherin, schaut
let ben; // Besucher, dessen Daten sie nicht sehen darf
let secretRow;
let storeRow;

beforeAll(async () => {
  anna = await registerAndLogin('anna-regeln');
  ben = await registerAndLogin('ben-regeln');
  [secretRow] = await adminList('store_secrets');
  [storeRow] = await adminList('store');
});

describe('store_secrets: Türgeheimnis nur für Superuser', () => {
  it('Liste ohne Anmeldung: 403', async () => {
    const res = await call('GET', '/api/collections/store_secrets/records');
    expect(kurz(res)).toEqual(NUR_SUPERUSER);
  });

  it('Liste als Besucherin: 403', async () => {
    const res = await call('GET', '/api/collections/store_secrets/records', { token: tokenVon(anna) });
    expect(kurz(res)).toEqual(NUR_SUPERUSER);
  });

  it('Einzelabruf ohne Anmeldung und als Besucherin: 403', async () => {
    const pfad = `/api/collections/store_secrets/records/${secretRow.id}`;
    expect(kurz(await call('GET', pfad))).toEqual(NUR_SUPERUSER);
    expect(kurz(await call('GET', pfad, { token: tokenVon(anna) }))).toEqual(NUR_SUPERUSER);
  });

  it('Anlegen und Überschreiben als Besucherin: 403', async () => {
    const token = tokenVon(anna);
    const body = { checkin_qr_secret: 'selbst-gesetzt' };
    expect(kurz(await call('POST', '/api/collections/store_secrets/records', { token, body }))).toEqual(NUR_SUPERUSER);
    expect(
      kurz(await call('PATCH', `/api/collections/store_secrets/records/${secretRow.id}`, { token, body }))
    ).toEqual(NUR_SUPERUSER);
    // Und das Geheimnis ist unverändert.
    const [nachher] = await adminList('store_secrets');
    expect(nachher.checkin_qr_secret).toBe(secretRow.checkin_qr_secret);
  });

  it('der Superuser sieht es', async () => {
    const res = await call('GET', '/api/collections/store_secrets/records', { token: await superuserToken() });
    expect(res.status).toBe(200);
    expect(res.body.totalItems).toBe(1);
    expect(res.body.items[0].checkin_qr_secret).toMatch(/^[A-Za-z0-9]{32}$/);
  });
});

describe('store: lesbar für Angemeldete, ohne Türgeheimnis', () => {
  it('ohne Anmeldung: leere Liste und 404 beim Einzelabruf', async () => {
    const liste = await call('GET', '/api/collections/store/records');
    expect(liste.status).toBe(200);
    expect(liste.body.totalItems).toBe(0);
    expect(liste.body.items).toEqual([]);
    const einzeln = await call('GET', `/api/collections/store/records/${storeRow.id}`);
    expect(einzeln.status).toBe(404);
  });

  it('als Besucherin: der Laden, das Altfeld leer, das Geheimnis nirgends in der Antwort', async () => {
    const res = await call('GET', '/api/collections/store/records', { token: tokenVon(anna) });
    expect(res.status).toBe(200);
    expect(res.body.totalItems).toBe(1);
    const s = res.body.items[0];
    expect(s.id).toBe(storeRow.id);
    expect(s.name).toBe('Plietsche Plünn');
    expect(s.checkin_qr_secret).toBe('');
    // Nicht nur im Altfeld: Der Wert steht an keiner Stelle der Antwort.
    expect(JSON.stringify(res.body).includes(secretRow.checkin_qr_secret)).toBe(false);
  });

  it('als Besucherin: der Einzelabruf enthält das Geheimnis ebenso wenig', async () => {
    const res = await call('GET', `/api/collections/store/records/${storeRow.id}`, { token: tokenVon(anna) });
    expect(res.status).toBe(200);
    expect(res.body.checkin_qr_secret).toBe('');
    expect(JSON.stringify(res.body).includes(secretRow.checkin_qr_secret)).toBe(false);
  });

  it('als Besucherin: nicht änderbar (404)', async () => {
    // Die updateRule lautet auf role = "admin". PocketBase 0.40 antwortet auf
    // eine nicht erfüllte Schreibregel mit 404 (gemessen), wie beim Lesen.
    const res = await call('PATCH', `/api/collections/store/records/${storeRow.id}`, {
      token: tokenVon(anna),
      body: { checkin_qr_secret: 'selbst-gesetzt' },
    });
    expect(res.status).toBe(404);
    const [nachher] = await adminList('store');
    expect(nachher.checkin_qr_secret).toBe('');
  });
});

describe('visits: nur die eigenen', () => {
  let bensBesuch;
  let annasBesuch;

  beforeAll(async () => {
    const besuch = (user) => ({ user, checkin_at: '2026-09-26 10:00:00.000Z', items_count: 0 });
    bensBesuch = await alsSuperuserAnlegen('visits', besuch(ben.id));
    annasBesuch = await alsSuperuserAnlegen('visits', besuch(anna.id));
  });

  it('fremder Besuch: nicht in der Liste, 404 beim Einzelabruf', async () => {
    const liste = await call('GET', '/api/collections/visits/records?perPage=200', { token: tokenVon(anna) });
    expect(liste.status).toBe(200);
    expect(liste.body.items.map((v) => v.id)).toEqual([annasBesuch.id]);
    const einzeln = await call('GET', `/api/collections/visits/records/${bensBesuch.id}`, { token: tokenVon(anna) });
    expect(einzeln.status).toBe(404);
  });

  it('fremder Besuch auch nicht über einen Filter auf dessen Nutzer-ID', async () => {
    const q = new URLSearchParams({ filter: `user = "${ben.id}"` });
    const res = await call('GET', `/api/collections/visits/records?${q}`, { token: tokenVon(anna) });
    expect(res.status).toBe(200);
    expect(res.body.totalItems).toBe(0);
  });

  it('eigener Besuch: sichtbar', async () => {
    const res = await call('GET', `/api/collections/visits/records/${bensBesuch.id}`, { token: tokenVon(ben) });
    expect(res.status).toBe(200);
    expect(res.body.user).toBe(ben.id);
  });

  it('ohne Anmeldung: leere Liste', async () => {
    const res = await call('GET', '/api/collections/visits/records');
    expect(res.status).toBe(200);
    expect(res.body.totalItems).toBe(0);
  });

  it('selbst anlegen: 403, auch für das eigene Konto', async () => {
    const res = await call('POST', '/api/collections/visits/records', {
      token: tokenVon(anna),
      body: { user: anna.id, checkin_at: '2026-09-26 11:00:00.000Z' },
    });
    expect(kurz(res)).toEqual(NUR_SUPERUSER);
  });
});

describe('points_log: nur die eigenen Buchungen', () => {
  let bensBuchung;
  let annasBuchung;

  beforeAll(async () => {
    bensBuchung = await alsSuperuserAnlegen('points_log', { user: ben.id, points: 10, kind: 'checkin', label: 'Check-in' });
    annasBuchung = await alsSuperuserAnlegen('points_log', { user: anna.id, points: 5, kind: 'scan', label: 'Mitgenommen' });
  });

  it('fremde Buchung: nicht in der Liste, 404 beim Einzelabruf', async () => {
    const liste = await call('GET', '/api/collections/points_log/records?perPage=200', { token: tokenVon(anna) });
    expect(liste.status).toBe(200);
    expect(liste.body.items.map((p) => p.id)).toEqual([annasBuchung.id]);
    const einzeln = await call('GET', `/api/collections/points_log/records/${bensBuchung.id}`, {
      token: tokenVon(anna),
    });
    expect(einzeln.status).toBe(404);
  });

  it('eigene Buchung: sichtbar', async () => {
    const res = await call('GET', `/api/collections/points_log/records/${bensBuchung.id}`, { token: tokenVon(ben) });
    expect(res.status).toBe(200);
    expect(res.body.points).toBe(10);
  });

  it('selbst buchen: 403', async () => {
    const res = await call('POST', '/api/collections/points_log/records', {
      token: tokenVon(anna),
      body: { user: anna.id, points: 1000, kind: 'adjustment', label: 'selbst' },
    });
    expect(kurz(res)).toEqual(NUR_SUPERUSER);
  });
});

describe('action_counts: nur die eigenen Teilnahmezahlen', () => {
  let bensZaehler;

  beforeAll(async () => {
    // Eine längst beendete Aktion: action_counts braucht eine, aber eine
    // laufende würde die Punkte der anderen Testdateien vervielfachen — alle
    // teilen sich eine Instanz, und die Reihenfolge der Dateien ist nicht fest.
    const aktion = await alsSuperuserAnlegen('campaigns', {
      name: 'Regel-Aktion (beendet)',
      multiplier: 1,
      starts_at: '2020-01-01 00:00:00.000Z',
      ends_at: '2020-01-31 23:59:59.000Z',
    });
    bensZaehler = await alsSuperuserAnlegen('action_counts', { user: ben.id, campaign: aktion.id, count: 3 });
  });

  it('fremde Zeile: nicht in der Liste, 404 beim Einzelabruf', async () => {
    const liste = await call('GET', '/api/collections/action_counts/records', { token: tokenVon(anna) });
    expect(liste.status).toBe(200);
    expect(liste.body.totalItems).toBe(0);
    const einzeln = await call('GET', `/api/collections/action_counts/records/${bensZaehler.id}`, {
      token: tokenVon(anna),
    });
    expect(einzeln.status).toBe(404);
  });

  it('eigene Zeile: sichtbar', async () => {
    const res = await call('GET', '/api/collections/action_counts/records', { token: tokenVon(ben) });
    expect(res.status).toBe(200);
    expect(res.body.items.map((a) => [a.id, a.count])).toEqual([[bensZaehler.id, 3]]);
  });
});

describe('items: fremde Einreichungen samt Standort bleiben verborgen', () => {
  let bensEinreichung;

  beforeAll(async () => {
    // Eingereicht über die App: Der Hook setzt status "pending".
    bensEinreichung = await ben.pb.collection('items').create({
      title: 'Winterjacke',
      location: 'Musterweg 1, bei Familie Beispiel',
      stays_external: true,
    });
  });

  it('der Hook hat die Einreichung als pending angelegt', () => {
    expect(bensEinreichung.status).toBe('pending');
    expect(bensEinreichung.created_by).toBe(ben.id);
  });

  it('fremde Einreichung: nicht in der Liste, 404 beim Einzelabruf', async () => {
    const q = new URLSearchParams({ filter: `created_by = "${ben.id}"`, perPage: '200' });
    const liste = await call('GET', `/api/collections/items/records?${q}`, { token: tokenVon(anna) });
    expect(liste.status).toBe(200);
    expect(liste.body.totalItems).toBe(0);
    const einzeln = await call('GET', `/api/collections/items/records/${bensEinreichung.id}`, {
      token: tokenVon(anna),
    });
    expect(einzeln.status).toBe(404);
  });

  it('fremde Einreichung: auch der Standort ist nicht über einen Filter abzutasten', async () => {
    // Ein Filter auf ein verborgenes Feld eines verborgenen Datensatzes darf
    // keine Treffer liefern — sonst ließe sich die Adresse Zeichen für
    // Zeichen erraten.
    const q = new URLSearchParams({ filter: 'location ~ "Musterweg"' });
    const res = await call('GET', `/api/collections/items/records?${q}`, { token: tokenVon(anna) });
    expect(res.status).toBe(200);
    expect(res.body.totalItems).toBe(0);
  });

  it('eigene Einreichung: sichtbar, mit Standort', async () => {
    const res = await call('GET', `/api/collections/items/records/${bensEinreichung.id}`, { token: tokenVon(ben) });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.location).toBe('Musterweg 1, bei Familie Beispiel');
    // Gegenprobe zum Filter-Test oben: Für Ben trifft derselbe Filter.
    const q = new URLSearchParams({ filter: 'location ~ "Musterweg"' });
    const gefiltert = await call('GET', `/api/collections/items/records?${q}`, { token: tokenVon(ben) });
    expect(gefiltert.body.items.map((i) => i.id)).toEqual([bensEinreichung.id]);
  });

  it('ohne Anmeldung: leere Liste', async () => {
    const res = await call('GET', '/api/collections/items/records');
    expect(res.status).toBe(200);
    expect(res.body.totalItems).toBe(0);
  });
});
