// Tests für die Auswahl des Vergleichsstands in .github/workflows/play-internal.yml.
//
// Der Schritt "Letzten veroeffentlichten Stand ermitteln" bestimmt, ab welchem
// Commit die Release-Notes entstehen. Ein Probelauf veröffentlicht nichts — er
// verwirft die Play-Bearbeitung —, endet aber mit Erfolg. Zählte er als
// Vergleichsstand, fielen beim nächsten echten Lauf alle Änderungen seit dem
// Probelauf aus den Hinweisen heraus, obwohl sie nie bei einem Menschen
// angekommen sind. In der Produktionsspur stünde dann „Kleinere Verbesserungen
// unter der Haube.", wo zwei Wochen Arbeit hingehörten.
//
// Getestet wird die Auswahllogik so, wie der Workflow sie ausführt: Das
// Python-Schnipsel wird aus der Workflow-Datei gelesen und als Prozess
// aufgerufen. Damit schlägt der Test auch dann fehl, wenn jemand den Filter im
// Workflow entfernt — eine nachgebaute Kopie hier im Test würde das verschweigen.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WORKFLOW = resolve(import.meta.dirname, '../.github/workflows/play-internal.yml');

/**
 * Schneidet das Python-Schnipsel aus dem Schritt heraus: von `import json, sys`
 * bis zur Zeile davor, die die Pipe öffnet. Der Workflow rückt den Block per
 * YAML-Blockskalar ein; die Einrückung ist beim Lesen bereits weg.
 */
function auswahlSkript() {
  const text = readFileSync(WORKFLOW, 'utf-8');
  const treffer = text.match(/^(\s*)import json, sys$[\s\S]*?^\s*"\)$/m);
  if (!treffer) throw new Error('Auswahl-Schnipsel in play-internal.yml nicht gefunden');
  const einzug = treffer[1];
  return treffer[0]
    .split('\n')
    .slice(0, -1) // die schließende Zeile `")` gehört zur Shell, nicht zu Python
    .map((z) => (z.startsWith(einzug) ? z.slice(einzug.length) : z))
    .join('\n');
}

/** Ruft die Auswahl mit einer gestellten API-Antwort auf. */
function gewaehlterStand(runs) {
  return execFileSync('python3', ['-c', auswahlSkript()], {
    input: JSON.stringify({ workflow_runs: runs }),
    encoding: 'utf-8',
  }).trim();
}

const echt = (sha, spur = 'internal') => ({ display_title: `Google Play ${spur}`, head_sha: sha });
const probe = (sha, spur = 'internal') => ({
  display_title: `[Probelauf] Google Play ${spur}`,
  head_sha: sha,
});

describe('Vergleichsstand für die Release-Notes', () => {
  it('nimmt den neuesten Lauf, wenn kein Probelauf dazwischenliegt', () => {
    expect(gewaehlterStand([echt('1111111'), echt('2222222')])).toBe('1111111');
  });

  it('überspringt einen Probelauf und nimmt den echten Lauf davor', () => {
    expect(gewaehlterStand([probe('1111111'), echt('2222222')])).toBe('2222222');
  });

  it('überspringt mehrere Probeläufe hintereinander', () => {
    expect(
      gewaehlterStand([probe('1111111'), probe('2222222', 'alpha'), echt('3333333')]),
    ).toBe('3333333');
  });

  it('erkennt Probeläufe unabhängig von der Spur', () => {
    expect(gewaehlterStand([probe('1111111', 'beta'), echt('2222222', 'alpha')])).toBe('2222222');
  });

  it('liefert nichts, wenn es nur Probeläufe gibt — dann greift der Rückfall', () => {
    expect(gewaehlterStand([probe('1111111'), probe('2222222')])).toBe('');
  });

  it('liefert nichts, wenn es noch keinen Lauf gibt', () => {
    expect(gewaehlterStand([])).toBe('');
  });
});

describe('Der Workflow markiert Probeläufe im Titel', () => {
  // Die Auswahl oben erkennt Probeläufe an der Marke [Probelauf]. Die muss der
  // Workflow auch tatsächlich setzen — sonst filtert die Auswahl ins Leere.
  const text = readFileSync(WORKFLOW, 'utf-8');

  it('setzt einen run-name, der bei probelauf die Marke trägt', () => {
    const zeile = text.match(/^run-name:[\s\S]*?\n\n/m);
    expect(zeile).not.toBeNull();
    expect(zeile[0]).toContain('inputs.probelauf');
    expect(zeile[0]).toContain('[Probelauf]');
  });

  it('fragt genug Läufe ab, um über Probeläufe hinwegzukommen', () => {
    // Mit per_page=1 wäre der Filter wirkungslos: Ein Probelauf an der Spitze
    // liefert dann gar kein Ergebnis, statt den echten Lauf davor zu finden.
    const abfrage = text.match(/play-internal\.yml\/runs\?[^"]*/);
    expect(abfrage).not.toBeNull();
    const perPage = Number(abfrage[0].match(/per_page=(\d+)/)[1]);
    expect(perPage).toBeGreaterThanOrEqual(20);
  });
});
