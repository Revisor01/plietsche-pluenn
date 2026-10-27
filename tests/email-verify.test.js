// E-Mail-Bestätigung in den Screens als Text ohne Kommentare; der Ablauf läuft in tests/auth-flow.test.js.

import { describe, it, expect } from 'vitest';
import { code } from './helper/quelltext.js';

describe('Anzeige im Profil', () => {
  const konto = code('mobile/app/(visitor)/settings/account.tsx');

  it('zeigt den Stand der Bestätigung', () => {
    expect(konto).toMatch(/user\?\.verified\s*\?\s*'Bestätigt'\s*:\s*'Noch nicht bestätigt'/);
  });

  it('holt requestVerification aus useAuth und ruft es beim Senden auf', () => {
    expect(konto).toMatch(/const\s*\{[^}]*\brequestVerification\b[^}]*\}\s*=\s*useAuth\(\)/);
    const senden = konto.slice(konto.indexOf('const sendVerification'));
    expect(senden.slice(0, 200)).toMatch(/await requestVerification\(\)/);
  });

  it('bietet den Knopf nur an, solange die Adresse offen ist', () => {
    const i = konto.indexOf('{!user?.verified && (');
    expect(i, 'Bedingung !user?.verified fehlt').toBeGreaterThan(-1);
    expect(konto.slice(i, i + 700)).toMatch(/onPress=\{sendVerification\}/);
  });

  it('nennt den Spam-Ordner', () => {
    // Der häufigste Grund, warum die Mail „nicht ankommt".
    const senden = konto.slice(konto.indexOf('const sendVerification'));
    expect(senden.slice(0, 400)).toMatch(/Spam-Ordner/);
  });
});

describe('Erinnerung auf der Startseite', () => {
  const start = code('mobile/app/(visitor)/index.tsx');

  it('erscheint nur, solange die Adresse offen ist, und führt ins Profil', () => {
    // Nur bei !user?.verified.
    const i = start.indexOf('!user?.verified && (');
    expect(i, 'Bedingung !user?.verified fehlt').toBeGreaterThan(-1);
    expect(start.slice(i, i + 400)).toMatch(/router\.push\('\/\(visitor\)\/settings\/account/);
  });
});
