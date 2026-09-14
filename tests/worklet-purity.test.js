// Worklets dürfen keine gewöhnliche JS-Funktion aufrufen.
//
// `useAnimatedStyle` & Co. laufen auf dem UI-Thread. Alles, was dort steht,
// wird von Reanimated in eine eigene Laufzeit übertragen; eine im JS-Thread
// definierte Funktion existiert dort nicht. Der Aufruf endet nicht mit einer
// falschen Farbe, sondern reißt den ganzen Screen ab:
//
//   Uncaught Error: [Worklets] Tried to synchronously call a Remote Function.
//   Called "alpha" on the UI Runtime.
//
// Genau das ist passiert: Beim Zusammenführen der Design-Farben wurde in
// Toggle.tsx die feste Spurfarbe durch `alpha(PP.ink, 'medium')` ersetzt —
// innerhalb des Worklets. Jede Ansicht mit einem Schalter stürzte ab: die
// Detailansicht eines Teils, das Einstell-Formular, die Benachrichtigungen,
// die Admin-Bereiche für Badges und Suchanfragen.
//
// `tsc` sieht das nicht (der Aufruf ist typkorrekt) und die Backend-Tests auch
// nicht. Der Fehler zeigt sich erst zur Laufzeit, in der App. Dieser Test
// prüft die Quelle: Steht in einem Worklet-Rumpf ein Aufruf einer der
// Theme-Hilfsfunktionen, schlägt er fehl.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE = new URL('../mobile/', import.meta.url).pathname;

// Hooks, deren Rückruf Reanimated als Worklet auf dem UI-Thread ausführt.
const WORKLET_HOOKS = [
  'useAnimatedStyle',
  'useAnimatedProps',
  'useDerivedValue',
  'useAnimatedScrollHandler',
  'useAnimatedGestureHandler',
  'useAnimatedReaction',
  'runOnUI',
];

// Gewöhnliche Funktionen aus lib/theme.ts. Sie sind keine Worklets und dürfen
// deshalb nicht aus einem Worklet-Rumpf gerufen werden. Ihre Ergebnisse sind
// Zeichenketten und Zahlen — die berechnet man vorher und reicht sie hinein.
const JS_ONLY_HELPERS = ['alpha', 'radius', 'glow', 'surfaceElevation', 'ripple', 'pressedOpacity'];

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.expo' || entry === 'dist') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Schneidet den Rumpf eines Worklet-Rückrufs aus der Quelle. Gezählt wird ab
 * der öffnenden Klammer des Hook-Aufrufs bis zu ihrer Entsprechung — so bleibt
 * geschachtelter Code drin und der Rest der Datei draußen.
 */
function workletBodies(src) {
  const bodies = [];
  for (const hook of WORKLET_HOOKS) {
    let from = 0;
    for (;;) {
      const at = src.indexOf(`${hook}(`, from);
      if (at < 0) break;
      let depth = 0;
      let i = at + hook.length;
      let end = -1;
      for (; i < src.length; i++) {
        if (src[i] === '(') depth++;
        else if (src[i] === ')') {
          depth--;
          if (depth === 0) { end = i; break; }
        }
      }
      if (end < 0) break;
      bodies.push({ hook, body: src.slice(at, end + 1) });
      from = end + 1;
    }
  }
  return bodies;
}

describe('Worklets rufen keine gewöhnliche JS-Funktion', () => {
  const files = sourceFiles(join(MOBILE, 'app')).concat(
    sourceFiles(join(MOBILE, 'components')),
    sourceFiles(join(MOBILE, 'lib')),
  );

  it('findet die Dateien der App', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('kein Aufruf einer Theme-Hilfsfunktion im Worklet-Rumpf', () => {
    const offenders = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      if (!src.includes('react-native-reanimated')) continue;
      for (const { hook, body } of workletBodies(src)) {
        for (const helper of JS_ONLY_HELPERS) {
          if (new RegExp(`\\b${helper}\\s*\\(`).test(body)) {
            offenders.push(`${file.slice(MOBILE.length)}: ${helper}() in ${hook}()`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('erkennt den Fehler, wenn er wieder eingebaut wird', () => {
    // Gegenprobe: genau der Stand, der die Detailansicht abstürzen ließ.
    const broken = `
      import { useAnimatedStyle, withTiming } from 'react-native-reanimated';
      const track = useAnimatedStyle(() => ({
        backgroundColor: withTiming(value ? PP.teal : alpha(PP.ink, "medium")),
      }));
    `;
    const bodies = workletBodies(broken);
    expect(bodies).toHaveLength(1);
    expect(/\balpha\s*\(/.test(bodies[0].body)).toBe(true);
  });
});
