// Kontolöschung in den Screens als Text ohne Kommentare; der Ablauf selbst läuft in tests/auth-flow.test.js.

import { describe, it, expect } from 'vitest';
import { code } from './helper/quelltext.js';

describe('Konto löschen im Profil', () => {
  const konto = code('mobile/app/(visitor)/settings/account.tsx');

  it('reicht das eingegebene Passwort an deleteAccount weiter', () => {
    // Sonst schlüge die Prüfung immer fehl oder ein fester Wert ginge durch.
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
    // Gleiche Rückmeldung, ob die Adresse bekannt ist oder nicht.
    const i = login.indexOf('await requestPasswordReset(next)');
    expect(login.slice(i, i + 300)).toMatch(/'Falls es ein Konto mit dieser Adresse gibt/);
  });
});
