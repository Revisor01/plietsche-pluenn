// Icon-Umschalter: Auswahl zwischen den vier Gestaltungen des App-Symbols.
//
// Dunkelgrün ist die Vorgabe; die übrigen drei bleiben als Option.
//
// Dateien und app.json werden echt gelesen. Der Umschalter im Profil wird als
// Text geprüft, weil der Screen React-Native-Module nachzieht, die in Node
// nicht existieren — und zwar OHNE Kommentare und auf Aufrufe gebunden, damit
// ein auskommentierter Aufruf auffällt. Ob der Screen richtig rendert und das
// Symbol auf dem Gerät wirklich wechselt, sieht dieser Test nicht.

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
    // Das Plugin trägt für JEDES Symbol einen Eintrag ins Android-Manifest ein,
    // erzeugt die Bilddateien dazu aber nur, wenn es eine Android-Angabe gibt.
    // Fehlt sie, bricht der Android-Build ab ("resource mipmap/ic_launcher_ring
    // not found") — so geschehen vom 18. bis 26.09.2026, bemerkt erst beim
    // nächsten Play-Build.
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
    // Das Haupticon ist das, was ohne Zutun erscheint — es muss mit der
    // dunkelgrünen Datei übereinstimmen.
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
    // Das dunkelgrüne ist das Haupticon. Es wird nicht über seinen Namen
    // gesetzt, sondern durch Zurücksetzen — sonst zeigte iOS es als
    // "alternatives" Symbol, und getAppIconName läge daneben.
    //
    // Geprüft wird der Aufruf mit dem Unterscheidungsmerkmal `haupt`: Für
    // den Haupteintrag muss null herausfallen, für die anderen der Name.
    expect(konto).toMatch(/await setAlternateAppIcon\(\s*eintrag\.haupt\s*\?\s*null\s*:\s*eintrag\.name\s*\)/);
    // Und der Haupteintrag ist genau einer.
    expect(konto.match(/haupt:\s*true/g) ?? []).toHaveLength(1);
  });

  it('zeichnet den Rahmen nicht auf das Bild', () => {
    // borderWidth auf einem <Image> legt React Native als harte Kante ueber
    // das Motiv — sichtbar als schwarze Linien und Absaetze. Der Rahmen
    // gehoert deshalb auf eine Huelle darum.
    const bild = konto.slice(konto.indexOf('<Image'), konto.indexOf('<Image') + 320);
    expect(bild).not.toMatch(/borderWidth/);
  });

  it('zeigt die Vorschauen in fester, kleiner Groesse', () => {
    // Mit width: '100%' fuellte jede Kachel ein Viertel der Bildschirmbreite
    // — man sah nur einen Ausschnitt statt des Symbols.
    const bild = konto.slice(konto.indexOf('<Image'), konto.indexOf('<Image') + 320);
    expect(bild).toMatch(/width:\s*\d+/);
    expect(bild).not.toMatch(/width:\s*'100%'/);
  });

  it('prüft, ob das Gerät das überhaupt kann', () => {
    // Auf iPad-Web und älteren Geräten gibt es keine alternativen Symbole;
    // ohne Prüfung liefe der Aufruf in einen Fehler.
    expect(konto).toMatch(/if \(!supportsAlternateIcons\)\s*\{\s*return/);
  });
});
