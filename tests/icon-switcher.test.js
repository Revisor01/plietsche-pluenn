// Icon-Umschalter: Auswahl zwischen den drei Entwürfen.
//
// Dient dem Ausprobieren auf dem Gerät — die Entscheidung, welches Symbol
// die App dauerhaft trägt, steht noch aus. Der Umschalter fliegt wieder
// raus, sobald sie gefallen ist.
//
// Geprüft wird die Quelle: Die Dateien ziehen React-Native-Module nach, die
// in Node nicht existieren.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

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

  it('tragen das dunkelgrüne als Vorauswahl', () => {
    // Das Haupticon ist das, was ohne Zutun erscheint — es muss mit der
    // Datei des dunkelgrünen Entwurfs übereinstimmen.
    const haupt = readFileSync(pfad('../mobile/assets/icon.png'));
    const dunkel = readFileSync(pfad('../mobile/assets/icons/dunkel.png'));
    expect(haupt.equals(dunkel)).toBe(true);
  });
});

describe('Der Umschalter im Profil', () => {
  const konto = lies('../mobile/app/(visitor)/settings/account.tsx');

  it('ist vorhanden', () => {
    expect(konto).toContain('setAlternateAppIcon');
  });

  it('bietet alle vier Entwürfe an', () => {
    for (const name of ['Ring', 'Sand', 'Scheibe', 'Dunkel']) {
      expect(konto).toContain(`'${name}'`);
    }
  });

  it('setzt das Haupticon über null zurück', () => {
    // Das dunkelgrüne ist das Haupticon. Es wird nicht über seinen Namen
    // gesetzt, sondern durch Zurücksetzen — sonst zeigte iOS es als
    // "alternatives" Symbol, und getAppIconName läge daneben.
    //
    // Geprüft wird der Aufruf mit dem Unterscheidungsmerkmal `haupt`: Für
    // den Haupteintrag muss null herausfallen, für die anderen der Name.
    expect(konto).toMatch(/setAlternateAppIcon\([^)]*haupt\s*\?\s*null\s*:/);
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
    expect(konto).toContain('supportsAlternateIcons');
  });
});
