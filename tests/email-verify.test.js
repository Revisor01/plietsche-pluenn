// E-Mail-Bestätigung: was die Screens zeigen und anbieten.
//
// Bis zum 18.09.2026 forderte die App nie eine Bestätigungsmail an. Konten
// standen deshalb dauerhaft auf `verified: false`, und niemand bekam je eine
// Mail — gemessen am Mailserver: null Zustellungen an die betroffene Adresse.
//
// Der Ablauf selbst (Mail nach der Anmeldung, Fehler schluckt die
// Registrierung nicht, Adresse aus dem angemeldeten Konto) wird in
// tests/auth-flow.test.js AUSGEFÜHRT.
//
// Hier bleiben Text-Prüfungen der Screens: Sie ziehen React-Native-Module
// nach, die in Node nicht existieren. Geprüft wird der Quelltext OHNE
// Kommentare, und zwar auf Aufrufe und Bedingungen, nicht auf bloße Namen —
// ein auskommentierter Aufruf fällt damit auf. Ob der Screen richtig
// rendert, sieht dieser Test nicht.

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
    // Negation im Bedingungsausdruck: Der Hinweis erscheint nur bei
    // !user?.verified — sonst stünde er dauerhaft da.
    const i = start.indexOf('!user?.verified && (');
    expect(i, 'Bedingung !user?.verified fehlt').toBeGreaterThan(-1);
    expect(start.slice(i, i + 400)).toMatch(/router\.push\('\/\(visitor\)\/settings\/account/);
  });
});
