// Abmelden mit Rückfrage und deutscher Gedankenstrich; Screens als Text ohne Kommentare.

import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { code } from './helper/quelltext.js';

const ROOT = new URL('..', import.meta.url).pathname;

describe('Abmelden fragt nach', () => {
  const ORTE = ['mobile/app/(visitor)/settings/account.tsx', 'mobile/app/(visitor)/settings/store.tsx'];

  for (const datei of ORTE) {
    it(`${datei}: Knopf ruft die Rückfrage, nicht logout direkt`, () => {
      const src = code(datei);
      expect(src).toMatch(/confirmSignOut\(logout\)/);
      expect(src).not.toMatch(/onPress=\{logout\}/);
    });
  }

  it('die Rückfrage meldet erst nach „Abmelden" ab, „Abbrechen" tut nichts', () => {
    const src = code('mobile/lib/confirmSignOut.ts');
    expect(src).toMatch(/Alert\.alert\(/);
    expect(src).toMatch(/\{\s*text: 'Abbrechen',\s*style: 'cancel'\s*\}/);
    expect(src).toMatch(/text: 'Abmelden',[^}]*onPress:[^}]*logout\(\)/);
    // logout steht nur im onPress des Abmelden-Knopfs, nirgends sonst.
    expect(src.match(/logout\(\)/g)).toHaveLength(1);
  });
});

describe('Gedankenstriche', () => {
  const VERZEICHNISSE = ['mobile/app', 'mobile/components', 'mobile/lib', 'pocketbase/pb_hooks'];

  const dateien = (dir) =>
    readdirSync(join(ROOT, dir)).flatMap((name) => {
      const voll = join(ROOT, dir, name);
      if (statSync(voll).isDirectory()) return dateien(relative(ROOT, voll));
      return /\.(tsx?|js)$/.test(name) ? [relative(ROOT, voll)] : [];
    });

  it('kein englischer Geviertstrich in Texten der App und des Backends', () => {
    const funde = VERZEICHNISSE.flatMap(dateien)
      .filter((f) => code(f).includes('—'))
      .sort();
    expect(funde).toEqual([]);
  });
});
