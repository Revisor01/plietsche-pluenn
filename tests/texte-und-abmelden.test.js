// Abmelden mit Rückfrage und deutsche Gedankenstriche.
//
// Beides kam aus dem Testbericht zur geschlossenen Testphase bei Google Play:
// Abmelden passierte ohne Rückfrage auf einen Tipp, und die App setzte den
// englischen Geviertstrich „—" statt des deutschen Gedankenstrichs „–".
//
// Die Screens ziehen React-Native-Module nach und laufen in Node nicht. Geprüft
// wird deshalb der Quelltext — ohne Kommentare, damit ein auskommentierter
// Aufruf auffällt. Ob der Dialog auf dem Gerät erscheint, sieht dieser Test
// nicht.

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
