// Kontoablaeufe: Registrieren, Bestaetigungsmail, Passwort vergessen,
// Abmelden, Konto loeschen.
//
// Diese Tests FUEHREN die Ablauflogik aus mobile/lib/authFlow.ts aus — gegen
// einen gestellten PocketBase-Client, der jeden Aufruf in eine Liste schreibt.
// Geprueft wird die tatsaechliche Aufruffolge, nicht der Quelltext: Ein
// auskommentierter Aufruf fehlt in der Liste und macht den Test rot.
//
// Vorher lasen die Tests useAuth.ts als Text und suchten nach Namen. Ein
// auskommentiertes `requestVerification(email)` blieb dabei gruen, weil der
// Name im Kommentar weiter dastand.

import { describe, it, expect } from 'vitest';
import { createAuthFlow } from '../mobile/lib/authFlow.ts';
import { code, ohneKommentare } from './helper/quelltext.js';

const ANGEMELDET = { id: 'u1', email: 'kim@example.org' };

/**
 * Baut die Abhaengigkeiten fuer createAuthFlow. Jeder Aufruf landet als
 * Eintrag in `log`. `fehler` nennt Schritte, die werfen sollen.
 */
function gestellt({ record = ANGEMELDET, fehler = [] } = {}) {
  const log = [];
  const wirft = (schritt) => {
    if (fehler.includes(schritt)) throw new Error(`${schritt} gescheitert`);
  };
  const authStore = {
    record,
    clear() {
      log.push(['authStore.clear']);
      this.record = null;
    },
  };
  const users = {
    async create(body) { log.push(['create', body]); wirft('create'); return { id: 'neu' }; },
    async authWithPassword(email, password) {
      log.push(['authWithPassword', email, password]);
      wirft('authWithPassword');
      return {};
    },
    async requestVerification(email) {
      log.push(['requestVerification', email]);
      wirft('requestVerification');
      return true;
    },
    async requestPasswordReset(email) {
      log.push(['requestPasswordReset', email]);
      wirft('requestPasswordReset');
      return true;
    },
    async delete(id) { log.push(['delete', id]); wirft('delete'); return true; },
  };
  const pb = {
    authStore,
    collection(name) {
      log.push(['collection', name]);
      return users;
    },
  };
  const deps = {
    pb,
    async unregisterPushToken() { log.push(['unregisterPushToken']); wirft('unregisterPushToken'); },
    clearQueryCache() { log.push(['clearQueryCache']); },
  };
  return { flow: createAuthFlow(deps), log, pb };
}

/** Die Aufrufe ohne die collection()-Eintraege — die Reihenfolge der Taten. */
const taten = (log) => log.filter(([n]) => n !== 'collection');

describe('register', () => {
  it('legt an, meldet an und fordert dann die Bestaetigungsmail an', async () => {
    const { flow, log } = gestellt({ record: null });
    await flow.register('neu@example.org', 'geheim123', 'Neu');

    expect(taten(log)).toEqual([
      ['create', {
        email: 'neu@example.org',
        password: 'geheim123',
        passwordConfirm: 'geheim123',
        name: 'Neu',
        role: 'visitor',
      }],
      ['authWithPassword', 'neu@example.org', 'geheim123'],
      ['requestVerification', 'neu@example.org'],
    ]);
    // Alles gegen die users-Sammlung, nicht gegen eine andere.
    expect(log.filter(([n]) => n === 'collection')).toEqual([
      ['collection', 'users'], ['collection', 'users'], ['collection', 'users'],
    ]);
  });

  it('scheitert nicht, wenn die Bestaetigungsmail nicht rausgeht', async () => {
    // Das Konto steht und die Person ist angemeldet — ein stehender
    // Mailversand darf die Registrierung nicht zurueckmelden.
    const { flow, log } = gestellt({ record: null, fehler: ['requestVerification'] });
    await expect(flow.register('neu@example.org', 'geheim123', 'Neu')).resolves.toBeUndefined();
    expect(taten(log).map(([n]) => n)).toEqual(['create', 'authWithPassword', 'requestVerification']);
  });

  it('meldet nicht an und fordert keine Mail an, wenn das Anlegen scheitert', async () => {
    const { flow, log } = gestellt({ record: null, fehler: ['create'] });
    await expect(flow.register('neu@example.org', 'geheim123', 'Neu')).rejects.toThrow('create gescheitert');
    expect(taten(log).map(([n]) => n)).toEqual(['create']);
  });
});

describe('deleteAccount', () => {
  it('loescht bei falschem Passwort nichts (verbotener Fall)', async () => {
    const { flow, log, pb } = gestellt({ fehler: ['authWithPassword'] });
    await expect(flow.deleteAccount('falsch')).rejects.toThrow('authWithPassword gescheitert');

    expect(taten(log)).toEqual([['authWithPassword', 'kim@example.org', 'falsch']]);
    // Weder abgemeldet noch Cache geleert: Die Person bleibt angemeldet.
    expect(pb.authStore.record).toEqual(ANGEMELDET);
  });

  it('prueft das Passwort und loescht dann in fester Reihenfolge (erlaubter Fall)', async () => {
    const { flow, log, pb } = gestellt();
    await flow.deleteAccount('richtig');

    expect(taten(log)).toEqual([
      ['authWithPassword', 'kim@example.org', 'richtig'],
      ['unregisterPushToken'],
      ['delete', 'u1'],
      ['authStore.clear'],
      ['clearQueryCache'],
    ]);
    expect(pb.authStore.record).toBeNull();
  });

  it('loescht auch dann, wenn die Push-Abmeldung scheitert', async () => {
    // Ein Geraet ohne Netz muss sein Konto trotzdem loeschen koennen.
    const { flow, log } = gestellt({ fehler: ['unregisterPushToken'] });
    await flow.deleteAccount('richtig');

    expect(taten(log).map(([n]) => n)).toEqual([
      'authWithPassword', 'unregisterPushToken', 'delete', 'authStore.clear', 'clearQueryCache',
    ]);
  });

  it('wirft ohne Anmeldung und ruft nichts auf', async () => {
    const { flow, log } = gestellt({ record: null });
    await expect(flow.deleteAccount('egal')).rejects.toThrow('not authenticated');
    expect(log).toEqual([]);
  });

  it('wirft, wenn am angemeldeten Konto keine Adresse haengt', async () => {
    // Ohne Adresse liesse sich das Passwort nicht pruefen — dann darf auch
    // nichts geloescht werden.
    const { flow, log } = gestellt({ record: { id: 'u1' } });
    await expect(flow.deleteAccount('egal')).rejects.toThrow('not authenticated');
    expect(log).toEqual([]);
  });
});

describe('requestVerification', () => {
  it('schickt an die Adresse des angemeldeten Kontos', async () => {
    const { flow, log } = gestellt();
    // Ein uebergebener Wert wird nicht beachtet: Sonst liessen sich fremde
    // Postfaecher mit Bestaetigungsmails beschicken.
    await flow.requestVerification('fremd@example.org');
    expect(taten(log)).toEqual([['requestVerification', 'kim@example.org']]);
  });

  it('wirft ohne Anmeldung und verschickt nichts', async () => {
    const { flow, log } = gestellt({ record: null });
    await expect(flow.requestVerification()).rejects.toThrow('not authenticated');
    expect(log).toEqual([]);
  });
});

describe('requestPasswordReset', () => {
  it('fordert den Link fuer die uebergebene Adresse an', async () => {
    const { flow, log } = gestellt({ record: null });
    await flow.requestPasswordReset('vergessen@example.org');
    expect(log).toEqual([
      ['collection', 'users'],
      ['requestPasswordReset', 'vergessen@example.org'],
    ]);
  });
});

describe('logout', () => {
  it('meldet erst den Push-Token ab, dann Auth-Store und Cache', async () => {
    const { flow, log, pb } = gestellt();
    await flow.logout();
    expect(taten(log)).toEqual([['unregisterPushToken'], ['authStore.clear'], ['clearQueryCache']]);
    expect(pb.authStore.record).toBeNull();
  });

  it('meldet auch ab, wenn die Push-Abmeldung scheitert', async () => {
    // Ein Geraet ohne Netz muss trotzdem rauskommen.
    const { flow, log, pb } = gestellt({ fehler: ['unregisterPushToken'] });
    await expect(flow.logout()).resolves.toBeUndefined();
    expect(taten(log)).toEqual([['unregisterPushToken'], ['authStore.clear'], ['clearQueryCache']]);
    expect(pb.authStore.record).toBeNull();
  });
});

// Die Ablauflogik nuetzt nur, wenn der Hook sie auch aufruft. useAuth.ts
// selbst laesst sich in Node nicht laden (React, SecureStore); geprueft wird
// deshalb der Quelltext OHNE Kommentare — ein auskommentierter Aufruf faellt
// damit auf.
describe('Verdrahtung in useAuth', () => {
  const hook = code('mobile/lib/hooks/useAuth.ts');

  it('baut die Ablauflogik mit den echten Abhaengigkeiten', () => {
    expect(hook).toMatch(
      /createAuthFlow\(\{\s*pb,\s*unregisterPushToken,\s*clearQueryCache:\s*\(\)\s*=>\s*queryClient\.clear\(\),?\s*\}\)/,
    );
  });

  it.each([
    ['register', 'email, password, name'],
    ['requestVerification', ''],
    ['requestPasswordReset', 'email'],
    ['logout', ''],
    ['deleteAccount', 'password'],
  ])('reicht %s an die Ablauflogik durch', (name, args) => {
    const i = hook.indexOf(`    ${name}: async`);
    expect(i, `${name} fehlt im Hook`).toBeGreaterThan(-1);
    const rumpf = hook.slice(i, hook.indexOf('\n    },', i));
    expect(rumpf).toContain(`await flow.${name}(${args});`);
  });

  it('hat keine eigene Loesch- oder Mail-Logik mehr neben der Ablauflogik', () => {
    // Sonst gaebe es zwei Staende, und getestet waere nur einer.
    expect(hook).not.toMatch(/\.delete\(/);
    expect(hook).not.toMatch(/(?<!flow)\.requestVerification\(/);
    expect(hook).not.toMatch(/(?<!flow)\.requestPasswordReset\(/);
    expect(hook).not.toMatch(/unregisterPushToken\(\)/);
  });
});

describe('ohneKommentare', () => {
  it('entfernt Zeilen-, Block- und JSX-Kommentare', () => {
    const src = [
      'a(); // b();',
      '/* c(); */ d();',
      '{/* <X /> */}',
      '// await flow.register(email, password, name);',
    ].join('\n');
    expect(ohneKommentare(src)).toBe('a(); \n d();\n{}\n');
  });

  it('laesst URLs und Kommentarzeichen in Zeichenketten stehen', () => {
    const src = "const u = 'https://x.de/*a*/'; const v = \"//b\"; const w = `//c`; // weg";
    expect(ohneKommentare(src)).toBe("const u = 'https://x.de/*a*/'; const v = \"//b\"; const w = `//c`; ");
  });

  it('laesst einen Apostroph im Text nicht ueber das Zeilenende hinaus wirken', () => {
    const src = "<T>Geht's</T>\n// f();\ng();";
    expect(ohneKommentare(src)).toBe("<T>Geht's</T>\n\ng();");
  });
});
