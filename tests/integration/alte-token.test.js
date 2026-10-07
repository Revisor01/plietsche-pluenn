// Anmelde-Token aus PocketBase 0.22 — die Handys, die vor dem Upgrade
// angemeldet waren.
//
// 0.22 stellte Token mit type "authRecord" aus, 0.40 kennt nur noch "auth"
// und weist die alten ab (gemessen am 26.09.2026: HTTP 401 auf eine mit 0.22
// ausgestellte Anmeldung nach dem Upgrade). Eine Übergangs-Middleware
// (pb_hooks/compat.pb.js) hat sie eine Zeit lang wieder angenommen; sie ist
// am 07.10.2026 entfernt worden — Produktion hatte nur Testkonten. Seitdem
// gilt: Ein alter Token öffnet nichts mehr, eine frische Anmeldung schon.
//
// Einen alten Token kann 0.40 nicht ausstellen; der Test baut ihn so, wie
// 0.22 ihn gebaut hat: HS256 über {collectionId, exp, id, type:"authRecord"}
// mit dem Schlüssel tokenKey des Kontos + Anmeldegeheimnis der Sammlung.
// Beides liest er an der API vorbei direkt aus der Datenbank der
// Testinstanz — über die API gibt PocketBase keines von beiden heraus.

import { describe, it, expect, beforeAll } from 'vitest';
import { inject } from 'vitest';
import { createHmac } from 'node:crypto';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { call, registerAndLogin } from './helpers.mjs';

function jwt(payload, key) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const body = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}`;
  return `${body}.${createHmac('sha256', key).update(body).digest('base64url')}`;
}

function lies(sql, ...args) {
  const db = new DatabaseSync(path.join(inject('pbDataDir'), 'data.db'), { readOnly: true });
  try {
    return db.prepare(sql).get(...args);
  } finally {
    db.close();
  }
}

let anna;
let usersId;
let key;

beforeAll(async () => {
  anna = await registerAndLogin('alttoken');
  const col = lies("SELECT id, json_extract(options, '$.authToken.secret') AS secret FROM _collections WHERE name = 'users'");
  const { tokenKey } = lies('SELECT tokenKey FROM users WHERE id = ?', anna.id);
  usersId = col.id;
  key = tokenKey + col.secret;
});

const inEinerStunde = () => Math.floor(Date.now() / 1000) + 3600;

describe('Token im 0.22-Format (ohne Übergangsregel)', () => {
  it('öffnet das eigene Konto nicht mehr', async () => {
    const alt = jwt({ collectionId: usersId, exp: inEinerStunde(), id: anna.id, type: 'authRecord' }, key);
    const res = await call('GET', `/api/collections/users/records/${anna.id}`, { token: alt });
    // Ohne gültige Anmeldung greift die Leseregel id = @request.auth.id nicht:
    // PocketBase meldet den Datensatz als nicht vorhanden.
    expect(res.status).toBe(404);
  });

  it('wird von einer eigenen Route mit 401 abgewiesen', async () => {
    const alt = jwt({ collectionId: usersId, exp: inEinerStunde(), id: anna.id, type: 'authRecord' }, key);
    const res = await call('POST', '/api/pp/push/register', {
      token: alt,
      body: { expo_token: 'ExponentPushToken[alter-token-1]', platform: 'ios' },
    });
    expect(res.status).toBe(401);
  });
});

describe('Token aus einer frischen Anmeldung', () => {
  it('öffnet das eigene Konto', async () => {
    const res = await call('GET', `/api/collections/users/records/${anna.id}`, { token: anna.pb.authStore.token });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(anna.id);
  });

  it('wird von einer eigenen Route angenommen', async () => {
    const res = await call('POST', '/api/pp/push/register', {
      token: anna.pb.authStore.token,
      body: { expo_token: 'ExponentPushToken[neuer-token-1]', platform: 'ios' },
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
