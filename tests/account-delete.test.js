// Kontolöschung: Reihenfolge und Absicherung.
//
// `deleteAccount` in mobile/lib/hooks/useAuth.ts löscht das Konto endgültig.
// Drei Eigenschaften müssen stimmen, und keine davon sieht `tsc`:
//
//  1. Das Passwort wird geprüft, BEVOR gelöscht wird. Sonst könnte jemand an
//     einem entsperrten fremden Gerät das Konto ausradieren.
//  2. Der Push-Token wird abgemeldet, solange die Anmeldung noch gilt — die
//     Route /api/pp/push/unregister verlangt ein gültiges Token. Nach dem
//     Löschen ginge es nicht mehr.
//  3. Nach dem Löschen werden Auth-Store und Query-Cache geleert, sonst sähe
//     die nächste Person am Gerät noch Name, Punkte und Verlauf.
//
// Geprüft wird die Quelle, nicht das Laufzeitverhalten: Die Datei zieht
// React-Native-Module nach, die in Node nicht existieren.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const QUELLE = new URL('../mobile/lib/hooks/useAuth.ts', import.meta.url).pathname;
const text = readFileSync(QUELLE, 'utf-8');

/** Schneidet den Rumpf von `deleteAccount` heraus. */
function deleteAccountRumpf() {
  const start = text.indexOf('deleteAccount:');
  expect(start, 'deleteAccount fehlt in useAuth.ts').toBeGreaterThan(-1);
  // Bis zum Ende des zurückgegebenen Objekts — deleteAccount ist der letzte
  // Eintrag; ein späterer Eintrag würde hier mit erfasst, was den Test nur
  // strenger macht, nicht falsch.
  return text.slice(start);
}

describe('Kontolöschung', () => {
  it('prüft das Passwort, bevor gelöscht wird', () => {
    const rumpf = deleteAccountRumpf();
    const prüfung = rumpf.indexOf('authWithPassword');
    const löschung = rumpf.indexOf(".delete(id)");

    expect(prüfung, 'keine Passwortprüfung in deleteAccount').toBeGreaterThan(-1);
    expect(löschung, 'kein Löschaufruf in deleteAccount').toBeGreaterThan(-1);
    expect(prüfung).toBeLessThan(löschung);
  });

  it('meldet den Push-Token vor dem Löschen ab', () => {
    const rumpf = deleteAccountRumpf();
    const abmeldung = rumpf.indexOf('unregisterPushToken');
    const löschung = rumpf.indexOf(".delete(id)");

    expect(abmeldung, 'kein unregisterPushToken in deleteAccount').toBeGreaterThan(-1);
    expect(abmeldung).toBeLessThan(löschung);
  });

  it('räumt Auth-Store und Query-Cache nach dem Löschen', () => {
    const rumpf = deleteAccountRumpf();
    const löschung = rumpf.indexOf(".delete(id)");
    const authWeg = rumpf.indexOf('authStore.clear()');
    const cacheWeg = rumpf.indexOf('queryClient.clear()');

    expect(authWeg, 'authStore wird nicht geleert').toBeGreaterThan(löschung);
    expect(cacheWeg, 'queryClient wird nicht geleert').toBeGreaterThan(löschung);
  });

  it('lässt einen fehlgeschlagenen Push-Abmeldeversuch das Löschen nicht verhindern', () => {
    // Ein Gerät ohne Netz muss sein Konto trotzdem löschen können. Der Aufruf
    // steht deshalb in einem try/catch — ohne das bräche die ganze Funktion ab.
    const rumpf = deleteAccountRumpf();
    const abschnitt = rumpf.slice(0, rumpf.indexOf(".delete(id)"));
    expect(abschnitt).toMatch(/try\s*\{[\s\S]*unregisterPushToken[\s\S]*\}\s*catch/);
  });
});

describe('Passwort vergessen', () => {
  it('ist in useAuth vorhanden und nutzt die PocketBase-Route', () => {
    expect(text).toMatch(/requestPasswordReset:\s*async/);
    expect(text).toMatch(/collection\('users'\)\.requestPasswordReset/);
  });

  it('wird im Login-Screen angeboten', () => {
    const login = readFileSync(
      new URL('../mobile/app/(auth)/login.tsx', import.meta.url).pathname,
      'utf-8',
    );
    expect(login).toContain('requestPasswordReset');
    expect(login).toContain('Passwort vergessen?');
  });

  it('verrät nicht, ob es zu einer Adresse ein Konto gibt', () => {
    // Die Rückmeldung muss gleich lauten, ob die Adresse bekannt ist oder
    // nicht — sonst ließe sich über den Login-Screen herausfinden, wer
    // Kundin des Ladens ist.
    const login = readFileSync(
      new URL('../mobile/app/(auth)/login.tsx', import.meta.url).pathname,
      'utf-8',
    );
    expect(login).toMatch(/Falls es ein Konto/);
  });
});
