// Foto-Uploads als expo-file-system-File, weil expo/fetch die RN-Form nicht umwandelt; Text ohne Kommentare.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { code } from './helper/quelltext.js';

const ORTE = ['mobile/lib/api.ts', 'mobile/app/(visitor)/items/[id].tsx'];

describe('Foto-Upload', () => {
  for (const datei of ORTE) {
    it(`${datei}: hängt das Foto als File an, nicht als { uri }`, () => {
      const src = code(datei);
      expect(src).not.toMatch(/append\(\s*'photo',\s*\{\s*uri/);
      expect(src).toMatch(/append\(\s*'photo',\s*photoPart\(/);
    });
  }

  it('photoPart baut ein File aus expo-file-system', () => {
    const src = code('mobile/lib/upload.ts');
    expect(src).toMatch(/import \{ File \} from 'expo-file-system'/);
    expect(src).toMatch(/new File\(uri\)/);
  });

  it('expo-file-system ist direkte Abhängigkeit der App', () => {
    const pkg = JSON.parse(readFileSync(new URL('../mobile/package.json', import.meta.url), 'utf-8'));
    expect(pkg.dependencies['expo-file-system']).toBeTruthy();
  });
});
