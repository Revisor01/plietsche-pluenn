// Anmelde-Token aus PocketBase 0.22 — die Handys, die vor dem Upgrade
// angemeldet waren.
//
// 0.22 stellte Token mit type "authRecord" aus, 0.40 kennt nur noch "auth"
// und weist die alten ab (gemessen am 26.09.2026: HTTP 401 auf eine mit 0.22
// ausgestellte Anmeldung nach dem Upgrade). Die Middleware
// pb_hooks/compat.pb.js nimmt sie für den Übergang wieder an. Jede App auf
// einem Gerät hängt daran — deshalb hier gegen das echte Binary.
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

describe('Token im 0.22-Format', () => {
  it('wird angenommen: eigenes Konto lesbar', async () => {
    const alt = jwt({ collectionId: usersId, exp: inEinerStunde(), id: anna.id, type: 'authRecord' }, key);
    const res = await call('GET', `/api/collections/users/records/${anna.id}`, { token: alt });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(anna.id);
  });

  it('wird angenommen: Push-Anmeldung wie beim App-Start', async () => {
    const alt = jwt({ collectionId: usersId, exp: inEinerStunde(), id: anna.id, type: 'authRecord' }, key);
    const res = await call('POST', '/api/pp/push/register', {
      token: alt,
      body: { expo_token: 'ExponentPushToken[alter-token-1]', platform: 'ios' },
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('wird mit falscher Signatur abgewiesen', async () => {
    const falsch = jwt({ collectionId: usersId, exp: inEinerStunde(), id: anna.id, type: 'authRecord' }, `${key}x`);
    const res = await call('POST', '/api/pp/push/register', {
      token: falsch,
      body: { expo_token: 'ExponentPushToken[alter-token-2]' },
    });
    expect(res.status).toBe(401);
  });

  it('wird abgewiesen, wenn er abgelaufen ist', async () => {
    const abgelaufen = jwt({ collectionId: usersId, exp: Math.floor(Date.now() / 1000) - 60, id: anna.id, type: 'authRecord' }, key);
    const res = await call('POST', '/api/pp/push/register', {
      token: abgelaufen,
      body: { expo_token: 'ExponentPushToken[alter-token-3]' },
    });
    expect(res.status).toBe(401);
  });

  it('wird ohne Signatur (alg none) abgewiesen', async () => {
    const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const ohne = `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ collectionId: usersId, exp: inEinerStunde(), id: anna.id, type: 'authRecord' })}.`;
    const res = await call('GET', `/api/collections/users/records/${anna.id}`, { token: ohne });
    expect(res.status).toBe(404);
  });
});
