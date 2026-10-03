// Fotos hochladen: „Teil bearbeiten" und „Teil einstellen".
//
// Gemeldet: Bild einfügen, speichern → „Keine Verbindung zum Laden-Server.
// Bist du online?" Der Server war erreichbar (gemessen: Uploads bis 20 MB
// werden angenommen und sauber beantwortet). Die Anfrage verließ das Gerät nie.
//
// Ursache: Expo 57 ersetzt fetch durch expo/fetch. Dessen FormData-Umwandlung
// kennt nur Text, Blob und Objekte mit bytes() — die React-Native-Form
// { uri, name, type } wirft „Unsupported FormDataPart implementation". Das
// PocketBase-SDK macht daraus einen Fehler mit Status 0, und errorText()
// übersetzt Status 0 mit „Bist du online?". Betroffen war jeder Upload mit
// Foto, auch Einreichungen von Besucher:innen.
//
// Der Schalter EXPO_PUBLIC_USE_RN_FETCH hilft nicht: Gemessen am fertigen
// Bündel wird er im Expo-Code nicht ersetzt, und process.env enthält zur
// Laufzeit nur NODE_ENV.
//
// Die Abhilfe: das Foto als File aus expo-file-system anhängen; File
// implementiert Blob und bytes(), das liest expo/fetch.
//
// Geprüft wird der Quelltext ohne Kommentare. Ob der Upload auf dem Gerät
// durchläuft, sieht dieser Test nicht.

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
