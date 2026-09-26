// Konto löschen und Passwort vergessen: was die Screens aufrufen.
//
// Die Sicherheitszusagen der Kontolöschung (Passwort vor Löschung, Push-
// Abmeldung vor Löschung, Aufräumen danach, Löschen trotz fehlgeschlagener
// Push-Abmeldung) werden in tests/auth-flow.test.js AUSGEFÜHRT — gegen einen
// gestellten PocketBase-Client, der jeden Aufruf mitschreibt.
//
// Hier bleiben Text-Prüfungen der Screens: Sie ziehen React-Native-Module
// nach, die in Node nicht existieren. Geprüft wird der Quelltext OHNE
// Kommentare und auf Aufrufe gebunden. Ob der Screen richtig rendert, sieht
// dieser Test nicht.

import { describe, it, expect } from 'vitest';
import { code } from './helper/quelltext.js';

describe('Konto löschen im Profil', () => {
  const konto = code('mobile/app/(visitor)/settings/account.tsx');

  it('reicht das eingegebene Passwort an deleteAccount weiter', () => {
    // Ohne das Passwort schlüge die Prüfung in deleteAccount immer fehl —
    // oder, schlimmer, jemand reichte einen festen Wert durch.
    expect(konto).toMatch(/const\s*\{[^}]*\bdeleteAccount\b[^}]*\}\s*=\s*useAuth\(\)/);
    expect(konto).toMatch(/await deleteAccount\(deletePw\)/);
  });

  it('fragt ohne eingegebenes Passwort gar nicht erst', () => {
    const i = konto.indexOf('const confirmDelete');
    expect(i).toBeGreaterThan(-1);
    expect(konto.slice(i, i + 200)).toMatch(/if \(!deletePw\)\s*\{[\s\S]*?return;/);
  });
});

describe('Passwort vergessen im Login', () => {
  const login = code('mobile/app/(auth)/login.tsx');

  it('ruft requestPasswordReset mit der eingegebenen Adresse auf', () => {
    expect(login).toMatch(/const\s*\{[^}]*\brequestPasswordReset\b[^}]*\}\s*=\s*useAuth\(\)/);
    expect(login).toMatch(/await requestPasswordReset\(next\)/);
  });

  it('bietet den Link sichtbar an', () => {
    expect(login).toMatch(/onPress=\{onForgotPassword\}/);
    expect(login).toContain("'Passwort vergessen?'");
  });

  it('verrät nicht, ob es zu einer Adresse ein Konto gibt', () => {
    // Die Rückmeldung muss gleich lauten, ob die Adresse bekannt ist oder
    // nicht — sonst ließe sich über den Login-Screen herausfinden, wer
    // Kundin des Ladens ist. Die Erfolgsmeldung folgt direkt auf den Aufruf.
    const i = login.indexOf('await requestPasswordReset(next)');
    expect(login.slice(i, i + 300)).toMatch(/'Falls es ein Konto mit dieser Adresse gibt/);
  });
});
