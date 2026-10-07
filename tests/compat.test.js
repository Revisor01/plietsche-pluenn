// Tests für die Übergangs-Middleware (compat.pb.js): Anmelde-Token aus
// PocketBase 0.22 nach dem Upgrade auf 0.40 weiter annehmen.
//
// Ohne sie liefen alle Handys, die vor dem Upgrade angemeldet waren,
// stillschweigend „leer" — 0.40 weist Token vom Typ "authRecord" ab und
// meldet der App dabei nichts. Die Middleware darf aber nur genau das
// annehmen, was 0.22 angenommen hätte: richtig signiert (tokenKey des Kontos
// + Anmeldegeheimnis der Sammlung), nicht abgelaufen, Konto in `users`.
// Jeder Fall, der durchrutscht, wäre eine Anmeldung ohne Passwort.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { loadHook, loadSchema, signJWT, USERS_TOKEN_SECRET } = createRequire(import.meta.url)('./harness.js');

const TOKEN_KEY = 'tokenkeyAnna0123456789abcdefghijklmnopqrstuvwxyzAB';
const USERS_ID = loadSchema().users.id;

function setup() {
  return loadHook('compat.pb.js', {
    users: [
      { __name: 'anna', id: 'anna00000000001', role: 'visitor', tokenKey: TOKEN_KEY },
      { __name: 'bert', id: 'bert00000000001', role: 'visitor', tokenKey: 'tokenkeyBert0123456789abcdefghijklmnopqrstuvwxyzAB' },
    ],
    items: [{ id: 'item00000000001', sku: 'PP-0001', title: 'Jacke' }],
  });
}

// Ein Token, wie PocketBase 0.22 ihn ausgestellt hat.
function alterToken(claims = {}, key = TOKEN_KEY + USERS_TOKEN_SECRET) {
  return signJWT(
    Object.assign(
      {
        collectionId: USERS_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
        id: 'anna00000000001',
        type: 'authRecord',
      },
      claims
    ),
    key
  );
}

function angemeldet(h, token) {
  return h.runMiddlewares({ headers: { Authorization: token } }).auth;
}

describe('Übergangs-Middleware für Token aus PocketBase 0.22', () => {
  it('nimmt einen gültigen alten Token an (erlaubter Fall)', () => {
    const h = setup();
    const auth = angemeldet(h, alterToken());
    expect(auth.id).toBe('anna00000000001');
    expect(auth.collectionName).toBe('users');
  });

  it('nimmt ihn auch mit vorangestelltem "Bearer " an', () => {
    const h = setup();
    expect(angemeldet(h, `Bearer ${alterToken()}`).id).toBe('anna00000000001');
  });

  it('weist einen gefälschten Token ab (falscher Schlüssel)', () => {
    const h = setup();
    expect(angemeldet(h, alterToken({}, 'geraten' + USERS_TOKEN_SECRET))).toBe(null);
  });

  it('weist einen Token ab, der nur mit dem Sammlungsgeheimnis signiert ist', () => {
    // Ohne tokenKey wäre ein Token für JEDES Konto fälschbar, sobald das
    // Geheimnis der Sammlung bekannt ist.
    const h = setup();
    expect(angemeldet(h, alterToken({}, USERS_TOKEN_SECRET))).toBe(null);
  });

  it('weist einen Token ab, dessen Konto-ID nachträglich getauscht wurde', () => {
    // Annas Signatur, aber Berts ID im Inhalt: Die Signatur passt nicht mehr
    // zum Inhalt (und Berts tokenKey ist ohnehin ein anderer).
    const h = setup();
    const echt = alterToken();
    const [kopf, , sig] = echt.split('.');
    const inhalt = Buffer.from(
      JSON.stringify({ collectionId: USERS_ID, exp: Math.floor(Date.now() / 1000) + 3600, id: 'bert00000000001', type: 'authRecord' })
    ).toString('base64url');
    expect(angemeldet(h, `${kopf}.${inhalt}.${sig}`)).toBe(null);
  });

  it('weist einen abgelaufenen alten Token ab', () => {
    const h = setup();
    expect(angemeldet(h, alterToken({ exp: Math.floor(Date.now() / 1000) - 60 }))).toBe(null);
  });

  it('weist einen alten Token ab, nachdem das Passwort geändert wurde (neuer tokenKey)', () => {
    const h = setup();
    const token = alterToken();
    const anna = h.records.anna;
    anna.set('tokenKey', 'tokenkeyNeu00123456789abcdefghijklmnopqrstuvwxyzAB');
    h.dao.saveRecord(anna);
    expect(angemeldet(h, token)).toBe(null);
  });

  it('nimmt nur den Typ "authRecord" an', () => {
    // Token im 0.40-Format ("auth") prüft PocketBase selbst; Admin-Token aus
    // 0.22 ("admin") gehören zu keinem Konto in `users`.
    const h = setup();
    expect(angemeldet(h, alterToken({ type: 'auth' }))).toBe(null);
    expect(angemeldet(h, alterToken({ type: 'admin' }))).toBe(null);
  });

  it('nimmt nur die Sammlung users an', () => {
    // Eine Sammlung ohne Anmeldegeheimnis und ohne tokenKey ergäbe einen
    // leeren Schlüssel — jeder könnte dafür signieren.
    const h = setup();
    const items = loadSchema().items.id;
    expect(angemeldet(h, alterToken({ collectionId: items, id: 'item00000000001' }, ''))).toBe(null);
    expect(angemeldet(h, alterToken({ collectionId: items, id: 'item00000000001' }))).toBe(null);
  });

  it('weist einen Token für ein Konto ab, das es nicht gibt', () => {
    const h = setup();
    expect(angemeldet(h, alterToken({ id: 'gibtsnicht00001' }))).toBe(null);
  });

  it('lässt Unlesbares und fehlende Köpfe ohne Fehler durch', () => {
    const h = setup();
    expect(angemeldet(h, 'kein.jwt')).toBe(null);
    expect(angemeldet(h, 'Bearer ')).toBe(null);
    expect(h.runMiddlewares({}).auth).toBe(null);
  });

  it('ändert nichts, wenn PocketBase schon jemanden angemeldet hat', () => {
    // Ein gültiger neuer Token hat Vorrang; der alte im Kopf spielt dann
    // keine Rolle.
    const h = setup();
    const e = h.runMiddlewares({ authRecord: h.records.bert, headers: { Authorization: alterToken() } });
    expect(e.auth.id).toBe('bert00000000001');
  });
});
