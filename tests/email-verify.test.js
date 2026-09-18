// E-Mail-Bestätigung: Ablauf und Absicherung.
//
// Bis zum 18.09.2026 forderte die App nie eine Bestätigungsmail an. Konten
// standen deshalb dauerhaft auf `verified: false`, und niemand bekam je eine
// Mail — gemessen am Mailserver: null Zustellungen an die betroffene Adresse.
//
// Geprüft wird die Quelle, nicht das Laufzeitverhalten: Die Dateien ziehen
// React-Native-Module nach, die in Node nicht existieren.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const lies = (p) => readFileSync(new URL(p, import.meta.url).pathname, 'utf-8');
const auth = lies('../mobile/lib/hooks/useAuth.ts');

/** Schneidet den Rumpf einer Methode aus dem zurückgegebenen Objekt heraus. */
function rumpf(name) {
  const start = auth.indexOf(`${name}:`);
  expect(start, `${name} fehlt in useAuth.ts`).toBeGreaterThan(-1);
  // Bis zum nächsten Eintrag auf derselben Ebene (vier Leerzeichen + Name:).
  const rest = auth.slice(start + name.length + 1);
  const ende = rest.search(/\n {4}[a-zA-Z]+:/);
  return ende === -1 ? rest : rest.slice(0, ende);
}

describe('Bestätigungsmail beim Registrieren', () => {
  it('wird nach dem Anlegen des Kontos angefordert', () => {
    const r = rumpf('register');
    expect(r).toContain('requestVerification');
  });

  it('wird erst nach der Anmeldung angefordert', () => {
    // Vorher gibt es kein gültiges Token; die Route würde die Anfrage
    // ablehnen und die Mail käme nie an.
    const r = rumpf('register');
    const anmeldung = r.indexOf('authWithPassword');
    const mail = r.indexOf('requestVerification');
    expect(anmeldung).toBeGreaterThan(-1);
    expect(anmeldung).toBeLessThan(mail);
  });

  it('lässt die Registrierung nicht an der Mail scheitern', () => {
    // Steht der Mailversand still, ist das Konto trotzdem angelegt und die
    // Person angemeldet. Ein Fehler hier darf die Registrierung nicht
    // zurückrollen — sonst kommt niemand mehr rein.
    const r = rumpf('register');
    const abschnitt = r.slice(r.indexOf('authWithPassword'));
    expect(abschnitt).toMatch(/try\s*\{[\s\S]*requestVerification[\s\S]*\}\s*catch/);
  });
});

describe('Bestätigung erneut anfordern', () => {
  it('ist in useAuth vorhanden', () => {
    expect(auth).toMatch(/requestVerification:\s*async/);
  });

  it('nutzt die Adresse des angemeldeten Kontos', () => {
    // Eine frei übergebene Adresse wäre ein Weg, fremde Postfächer mit
    // Bestätigungsmails zu beschicken.
    const r = rumpf('requestVerification');
    expect(r).toMatch(/authStore\.record\?\.email/);
  });
});

describe('Anzeige im Profil', () => {
  const konto = lies('../mobile/app/(visitor)/settings/account.tsx');

  it('zeigt den Stand der Bestätigung', () => {
    expect(konto).toContain('verified');
  });

  it('bietet einen Knopf zum erneuten Senden', () => {
    expect(konto).toContain('requestVerification');
  });

  it('nennt den Spam-Ordner', () => {
    // Der häufigste Grund, warum die Mail „nicht ankommt".
    expect(konto).toMatch(/Spam/);
  });
});

describe('Erinnerung auf der Startseite', () => {
  const start = lies('../mobile/app/(visitor)/index.tsx');

  it('zeigt einen Hinweis, solange die Adresse offen ist', () => {
    expect(start).toContain('verified');
  });

  it('blendet ihn aus, sobald bestätigt wurde', () => {
    // Negation im Bedingungsausdruck: Der Hinweis erscheint nur bei
    // !user?.verified — sonst stünde er dauerhaft da.
    expect(start).toMatch(/!user\?\.verified/);
  });

  it('führt ins Profil, wo sich die Mail erneut anfordern lässt', () => {
    const i = start.indexOf('verified');
    const abschnitt = start.slice(i, i + 1400);
    expect(abschnitt).toMatch(/settings\/account/);
  });
});
