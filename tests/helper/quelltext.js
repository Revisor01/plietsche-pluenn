// Quelltext fuer Text-Pruefungen vorbereiten.
//
// Einige Tests muessen .ts/.tsx-Dateien als Text lesen, weil die Screens
// React-Native-Module nachziehen, die in Node nicht existieren. Damit ein
// auskommentierter Aufruf dabei nicht als vorhanden durchgeht, entfernt
// `ohneKommentare` vorher alle Zeilen- und Blockkommentare (auch JSX-
// Kommentare `{/* ... */}`).
//
// Zeichenketten bleiben unangetastet: `'https://…'` ist kein Kommentar.
// Einfache und doppelte Anfuehrungszeichen enden spaetestens am Zeilenende
// (JS-Strings koennen nicht umbrechen) — ein Apostroph im JSX-Text kann
// deshalb hoechstens eine Zeile verschlucken, nicht den Rest der Datei.
// Regex-Literale werden nicht erkannt; ein `//` darin wuerde als Kommentar
// gelesen. In den geprueften Dateien kommt das nicht vor.

import { readFileSync } from 'node:fs';

export function ohneKommentare(src) {
  let aus = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && n === '*') {
      const ende = src.indexOf('*/', i + 2);
      // Zeilenumbrueche erhalten, damit Abstaende grob stimmen.
      const stueck = src.slice(i, ende === -1 ? src.length : ende + 2);
      aus += stueck.replace(/[^\n]/g, '');
      i = ende === -1 ? src.length : ende + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') j++;
        else if (c !== '`' && src[j] === '\n') break;
        j++;
      }
      aus += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    aus += c;
    i++;
  }
  return aus;
}

/** Liest eine Datei relativ zum Repo-Root und entfernt die Kommentare. */
export function code(relativ) {
  const pfad = new URL(`../../${relativ}`, import.meta.url).pathname;
  return ohneKommentare(readFileSync(pfad, 'utf-8'));
}
