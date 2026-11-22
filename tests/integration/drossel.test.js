// Drossel für Anmeldung je Adresse aus X-Real-IP; schaltet sie nur für diese Datei ein, weil sich alle Tests eine Instanz teilen.

import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { url, superuserToken, registerAndLogin } from './helpers.mjs';

const nachMigration = inject('nachMigration');
let konto;

async function setzeDrossel(enabled) {
  const res = await fetch(url() + '/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: await superuserToken() },
    body: JSON.stringify({ rateLimits: { ...nachMigration.rateLimits, enabled } }),
  });
  expect(res.status).toBe(200);
}

async function anmelden(ip, password) {
  const res = await fetch(url() + '/api/collections/users/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Real-IP': ip },
    body: JSON.stringify({ identity: konto.email, password }),
  });
  return res.status;
}

beforeAll(async () => {
  konto = await registerAndLogin('drossel');
  await superuserToken();
  await setzeDrossel(true);
});

afterAll(async () => {
  await setzeDrossel(false);
});

describe('Drossel nach der Migration', () => {
  it('liest die Client-Adresse aus X-Real-IP, nicht den linken X-Forwarded-For-Eintrag', () => {
    expect(nachMigration.trustedProxy.headers).toEqual(['X-Real-IP']);
    expect(nachMigration.trustedProxy.useLeftmostIP).toBe(false);
  });

  it('ist eingeschaltet, mit den Regeln für Anmeldung und Passwort-Reset statt der knappen Vorgaben', () => {
    expect(nachMigration.rateLimits.enabled).toBe(true);
    const regeln = Object.fromEntries(nachMigration.rateLimits.rules.map((r) => [r.label, [r.audience, r.duration, r.maxRequests]]));
    expect(regeln).toEqual({
      'users:authWithPassword': ['@guest', 60, 20],
      'users:requestPasswordReset': ['', 300, 5],
      '_superusers:authWithPassword': ['@guest', 60, 5],
    });
  });

  it('verboten: der 21. Anmeldeversuch einer Adresse in der Minute bekommt 429', async () => {
    const status = [];
    for (let i = 0; i < 21; i++) status.push(await anmelden('203.0.113.7', 'falsch-' + i));
    expect(status.slice(0, 20)).toEqual(new Array(20).fill(400));
    expect(status[20]).toBe(429);
  });

  it('verboten: auch die richtige Anmeldung derselben Adresse wartet', async () => {
    expect(await anmelden('203.0.113.7', konto.password)).toBe(429);
  });

  it('erlaubt: eine andere Adresse im selben Laden-Netz hinter dem Proxy meldet sich an', async () => {
    expect(await anmelden('198.51.100.9', konto.password)).toBe(200);
  });
});
