// Icon-Umschalter: Dateien und app.json echt, der Profil-Screen als Text ohne Kommentare.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { code } from './helper/quelltext.js';

const lies = (p) => readFileSync(new URL(p, import.meta.url).pathname, 'utf-8');
const pfad = (p) => new URL(p, import.meta.url).pathname;

describe('Die vier Symbole', () => {
  it('liegen als Dateien vor', () => {
    for (const name of ['sand', 'scheibe', 'dunkel', 'ring']) {
      expect(existsSync(pfad(`../mobile/assets/icons/${name}.png`)), `${name}.png fehlt`).toBe(true);
    }
  });

  it('sind in app.json als Auswahl eingetragen', () => {
    const cfg = JSON.parse(lies('../mobile/app.json'));
    const plugin = cfg.expo.plugins.find(
      (p) => Array.isArray(p) && p[0] === 'expo-alternate-app-icons',
    );
    expect(plugin, 'Plugin fehlt in app.json').toBeTruthy();
    expect(plugin[1].map((i) => i.name)).toEqual(['Ring', 'Sand', 'Scheibe', 'Dunkel']);
  });

  it('haben jedes eine Android-Fassung mit Vordergrund und Hintergrundfarbe', () => {
    // Ohne Android-Angabe bricht der Android-Build ab.
    const cfg = JSON.parse(lies('../mobile/app.json'));
    const plugin = cfg.expo.plugins.find(
      (p) => Array.isArray(p) && p[0] === 'expo-alternate-app-icons',
    );
    for (const icon of plugin[1]) {
      expect(icon.android, `${icon.name}: Android-Angabe fehlt`).toEqual({
        foregroundImage: `./assets/icons/android/${icon.name.toLowerCase()}.png`,
        backgroundColor: expect.stringMatching(/^#[0-9a-f]{6}$/),
      });
      expect(existsSync(pfad(`../mobile/${icon.android.foregroundImage}`)), `${icon.name}: Datei fehlt`).toBe(true);
    }
  });

  it('tragen das dunkelgrüne als Vorgabe', () => {
    const haupt = readFileSync(pfad('../mobile/assets/icon.png'));
    const dunkel = readFileSync(pfad('../mobile/assets/icons/dunkel.png'));
    expect(haupt.equals(dunkel)).toBe(true);
  });
});

describe('Der Umschalter im Profil', () => {
  const konto = code('mobile/app/(visitor)/settings/account.tsx');

  it('ist vorhanden und ruft setAlternateAppIcon auf', () => {
    expect(konto).toMatch(/import\s*\{[^}]*\bsetAlternateAppIcon\b[^}]*\}\s*from\s*'expo-alternate-app-icons'/);
    expect(konto).toMatch(/await setAlternateAppIcon\(/);
  });

  it('bietet alle vier Gestaltungen an', () => {
    for (const name of ['Ring', 'Sand', 'Scheibe', 'Dunkel']) {
      expect(konto).toMatch(new RegExp(`name:\\s*'${name}' as const`));
    }
  });

  it('setzt das Haupticon über null zurück', () => {
    // Das Haupticon über null setzen, sonst meldet iOS es als alternatives.
    expect(konto).toMatch(/await setAlternateAppIcon\(\s*eintrag\.haupt\s*\?\s*null\s*:\s*eintrag\.name\s*\)/);
    // Und der Haupteintrag ist genau einer.
    expect(konto.match(/haupt:\s*true/g) ?? []).toHaveLength(1);
  });

  it('zeichnet den Rahmen nicht auf das Bild', () => {
    // borderWidth auf <Image> zeichnet harte Kanten ins Motiv.
    const bild = konto.slice(konto.indexOf('<Image'), konto.indexOf('<Image') + 320);
    expect(bild).not.toMatch(/borderWidth/);
  });

  it('zeigt die Vorschauen in fester, kleiner Groesse', () => {
    // width: '100%' zeigte nur einen Ausschnitt.
    const bild = konto.slice(konto.indexOf('<Image'), konto.indexOf('<Image') + 320);
    expect(bild).toMatch(/width:\s*\d+/);
    expect(bild).not.toMatch(/width:\s*'100%'/);
  });

  it('prüft, ob das Gerät das überhaupt kann', () => {
    // Ohne alternative Symbole liefe der Aufruf in einen Fehler.
    expect(konto).toMatch(/if \(!supportsAlternateIcons\)\s*\{\s*return/);
  });
});
