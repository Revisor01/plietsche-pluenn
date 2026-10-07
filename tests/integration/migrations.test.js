// Laufen die Migrationen unter dem echten PocketBase 0.40 durch, und steht
// danach auf einer frischen Installation das, was die App braucht?
//
// Die globale Einrichtung startet PocketBase auf LEEREM pb_data. Kommt sie
// überhaupt bis hierher, sind alle Migrationen ohne Fehler gelaufen — eine
// scheiternde Migration hält den Start an. Die Tests hier prüfen, ob sie
// auch das Richtige angelegt haben.

import { describe, it, expect } from 'vitest';
import { call, superuserToken, adminList } from './helpers.mjs';

const EIGENE_SAMMLUNGEN = [
  'action_counts',
  'badges',
  'campaigns',
  'items',
  'needs',
  'points_log',
  'push_devices',
  'push_messages',
  'store',
  'store_secrets',
  'user_badges',
  'users',
  'visits',
];

describe('Migrationen auf leerem pb_data', () => {
  it('legen genau die 13 Sammlungen der App an', async () => {
    const token = await superuserToken();
    const res = await call('GET', '/api/collections?perPage=200', { token });
    expect(res.status).toBe(200);
    const eigene = res.body.items
      .filter((c) => !c.system)
      .map((c) => c.name)
      .sort();
    expect(eigene).toEqual(EIGENE_SAMMLUNGEN);
  });

  it('legen genau einen Laden mit den Rückfallwerten an', async () => {
    const stores = await adminList('store');
    expect(stores).toHaveLength(1);
    const s = stores[0];
    expect(s.lat).toBe(53.6045);
    expect(s.lng).toBe(9.9476);
    expect(s.geofence_radius_m).toBe(150);
    expect(s.pts_checkin).toBe(10);
    expect(s.pts_take).toBe(5);
    expect(s.pts_bring).toBe(5);
    expect(s.max_items_take).toBe(7);
    expect(s.timezone).toBe('Europe/Berlin');
    expect(s.tiers_json.map((t) => t.at)).toEqual([150, 750, 1500, 3000, 6000]);
    // Das Altfeld bleibt leer — das Geheimnis gehört nach store_secrets.
    expect(s.checkin_qr_secret).toBe('');
  });

  it('erzeugen ein zufälliges Türgeheimnis in store_secrets', async () => {
    const rows = await adminList('store_secrets');
    expect(rows).toHaveLength(1);
    expect(rows[0].checkin_qr_secret).toMatch(/^[A-Za-z0-9]{32}$/);
  });

  it('legen die vier Stufen-Abzeichen an', async () => {
    const badges = await adminList('badges');
    const kurz = badges
      .map((b) => [b.slug, b.kind, b.tier_bronze, b.tier_silber, b.tier_gold, b.tier_platin, b.is_visible])
      .sort((a, b) => a[0].localeCompare(b[0]));
    expect(kurz).toEqual([
      ['besucher', 'tiered', 5, 10, 25, 50, true],
      ['bringer', 'tiered', 10, 25, 50, 100, true],
      ['holer', 'tiered', 10, 25, 50, 100, true],
      ['streak', 'tiered', 2, 4, 8, 12, true],
    ]);
  });

  it('schalten die englische „Login from a new location"-Mail ab', async () => {
    const token = await superuserToken();
    const res = await call('GET', '/api/collections/users', { token });
    expect(res.status).toBe(200);
    expect(res.body.authAlert.enabled).toBe(false);
    // Die Bestätigungsmail verspricht eine Woche.
    expect(res.body.verificationToken.duration).toBe(604800);
    // Anmeldung 30 Tage auf einer frischen Installation (0.40 ab Werk: 5 Tage).
    // Produktion steht auf 14 Tagen; die Migration lässt einen gepflegten Wert stehen.
    expect(res.body.authToken.duration).toBe(2592000);
  });

  it('lassen Rate-Limiting aus, solange der Proxy-Kopf nicht gemessen ist', async () => {
    const token = await superuserToken();
    const res = await call('GET', '/api/settings', { token });
    expect(res.status).toBe(200);
    expect(res.body.rateLimits.enabled).toBe(false);
  });
});

describe('Leseregeln unangemeldet (dieselben Merkmale wie deploy-verify.py)', () => {
  it('store_secrets: 403 — für niemanden lesbar', async () => {
    const res = await call('GET', '/api/collections/store_secrets/records');
    expect(res.status).toBe(403);
  });

  for (const name of ['store', 'items', 'action_counts']) {
    it(`${name}: 200 mit leerer Liste`, async () => {
      const res = await call('GET', `/api/collections/${name}/records`);
      expect(res.status).toBe(200);
      expect(res.body.totalItems).toBe(0);
    });
  }

  it('_superusers: 403 — die Sammlung gibt es, sie ist geschlossen (Merkmal für 0.40)', async () => {
    const res = await call('GET', '/api/collections/_superusers/records');
    expect(res.status).toBe(403);
  });
});
