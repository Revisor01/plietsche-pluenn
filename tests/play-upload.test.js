// Tests für den Upload zu Google Play in play-internal.yml und release.yml.
//
// Hochgeladen wird über den Baustein play-upload.yml (Revisor01/workflows).
// Seine Logik (Status, Track-Liste, 500 Zeichen, Wiederholung, Verwerfen)
// prüft er in seinem eigenen Selbsttest; hier steht, dass beide Workflows ihn
// mit den richtigen Eingaben aufrufen und dass ein Probelauf nichts
// veröffentlicht.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pfad = (rel) => resolve(import.meta.dirname, '..', rel);
const lesen = (rel) => readFileSync(pfad(rel), 'utf-8');
const ohneKommentare = (t) => t.split('\n').filter((z) => !z.trim().startsWith('#')).join('\n');

/** Die Jobs eines Workflows: Name und Text bis zum nächsten Job, ohne Kommentare. */
function jobs(text) {
  const teil = text.slice(text.indexOf('\njobs:\n') + '\njobs:\n'.length);
  const koepfe = [...teil.matchAll(/^ {2}([A-Za-z0-9_-]+):\s*$/gm)];
  return Object.fromEntries(
    koepfe.map((k, i) => [k[1], ohneKommentare(teil.slice(k.index, i + 1 < koepfe.length ? koepfe[i + 1].index : undefined))]),
  );
}

const BAUSTEIN = /^ {4}uses: Revisor01\/workflows\/\.github\/workflows\/play-upload\.yml@[0-9a-f]{40} # \d+\.\d+\.\d+$/m;
const WORKFLOWS = {
  'play-internal.yml': lesen('.github/workflows/play-internal.yml'),
  'release.yml': lesen('.github/workflows/release.yml'),
};

describe('Freigabestatus', () => {
  for (const [name, text] of Object.entries(WORKFLOWS)) {
    it(`${name} bietet draft und completed an, Vorgabe completed`, () => {
      // draft soll bewusst gewählt werden; als Vorgabe blieben Fassungen
      // unbemerkt in der Konsole liegen.
      const block = text.match(/freigabe:[\s\S]*?default: (\w+)/);
      expect(block[0]).toContain('- completed');
      expect(block[0]).toContain('- draft');
      expect(block[1]).toBe('completed');
    });
  }

  it('play-internal.yml bietet die Produktionsspur an, Vorgabe internal', () => {
    const block = WORKFLOWS['play-internal.yml'].match(/spur:[\s\S]*?default: (\w+)/);
    expect(block[0]).toContain('- production');
    expect(block[0]).toContain('- internal');
    expect(block[1]).toBe('internal');
  });
});

describe('Aufruf des Bausteins', () => {
  it('play-internal.yml: Spur, Freigabe, Hinweise und Probelauf gehen an den Baustein', () => {
    const j = jobs(WORKFLOWS['play-internal.yml']);
    expect(j.upload).toMatch(BAUSTEIN);
    expect(j.upload).toContain('needs: [build]');
    expect(j.upload).toContain('paket: de.godsapp.plietschepluenn');
    expect(j.upload).toContain('tracks: ${{ inputs.spur }}');
    expect(j.upload).toContain('status: ${{ inputs.freigabe }}');
    expect(j.upload).toContain('production-anteil: "1"');
    expect(j.upload).toContain('release-notes: ${{ needs.build.outputs.hinweise }}');
    expect(j.upload).toContain('artefakt: aab');
    expect(j.upload).toContain('dry-run: ${{ inputs.probelauf }}');
    expect(j.upload).toContain('dienstkonto: ${{ secrets.GPLAY_SA_JSON_BASE64 }}');
    expect(j.build).toContain('hinweise: ${{ steps.hinweise.outputs.text }}');
  });

  it('release.yml: production, Freigabe, Hinweise und Probelauf gehen an den Baustein', () => {
    const j = jobs(WORKFLOWS['release.yml']);
    const u = j['android-upload'];
    expect(u).toMatch(BAUSTEIN);
    expect(u).toContain('needs: [android]');
    expect(u).toContain('tracks: production');
    expect(u).toContain('status: ${{ inputs.freigabe }}');
    expect(u).toContain('production-anteil: "1"');
    expect(u).toContain('release-notes: ${{ needs.android.outputs.hinweise }}');
    expect(u).toContain('artefakt: aab');
    expect(u).toContain('dry-run: ${{ inputs.probelauf }}');
    expect(j.android).toContain('hinweise: ${{ steps.hinweise.outputs.text }}');
  });

  it('beide legen das Paket als Artefakt ab, das eigene Skript ist weg', () => {
    for (const [name, text] of Object.entries(WORKFLOWS)) {
      expect(text, name).toMatch(/name: aab\n\s+path: \$\{\{ runner\.temp \}\}\/aab\//);
      expect(text, name).not.toContain('upload-play.py');
    }
    expect(existsSync(pfad('.github/scripts/upload-play.py'))).toBe(false);
  });
});

describe('Probelauf in release.yml', () => {
  const text = WORKFLOWS['release.yml'];
  const j = jobs(text);

  it('iOS entfällt beim Probelauf', () => {
    expect(j.ios).toContain("if: ${{ inputs.plattformen != 'nur Android' && !inputs.probelauf }}");
  });

  it('der versionCode wird nur im Probelauf angehoben', () => {
    expect(j.android).toContain('PROBELAUF: ${{ inputs.probelauf }}');
    expect(j.android).toMatch(/if os\.environ\.get\('PROBELAUF'\) == 'true':\n\s+code \+= 10000/);
  });

  it('der Titel trägt die Marke [Probelauf]', () => {
    expect(text).toMatch(/^run-name: >-\n {2}\$\{\{ inputs\.probelauf && '\[Probelauf\] ' \|\| '' \}\}/m);
  });

  it('der Vergleichsstand für die Hinweise überspringt Probeläufe', () => {
    const treffer = text.match(/^(\s*)import json, sys$[\s\S]*?^\s*"\)$/m);
    const einzug = treffer[1];
    const skript = treffer[0].split('\n').slice(0, -1)
      .map((z) => (z.startsWith(einzug) ? z.slice(einzug.length) : z)).join('\n');
    const lauf = (runs) => execFileSync('python3', ['-c', skript], {
      input: JSON.stringify({ workflow_runs: runs }), encoding: 'utf-8',
    }).trim();
    expect(lauf([
      { display_title: '[Probelauf] Veröffentlichen 1.0.1', head_sha: '1111111' },
      { display_title: 'Veröffentlichen 1.0.0', head_sha: '2222222' },
    ])).toBe('2222222');
    expect(lauf([{ display_title: 'Veröffentlichen 1.0.1', head_sha: '3333333' }])).toBe('3333333');
    expect(lauf([])).toBe('');
  });
});
