// Tests für .github/scripts/release-notes.py — die Hinweise, die Tester:innen
// in TestFlight und bei Google Play zu lesen bekommen.
//
// Hier zählt vor allem, was NICHT hineingerät: Der Text geht bei einer
// Veröffentlichung ungeprüft in die Produktionsspur. Steht dort „Keystore-
// Angaben an Gradle uebergeben", lesen das die Nutzer:innen im Store.
//
// Das Skript liest `git log` aus dem Arbeitsverzeichnis. Damit die Tests nicht
// an der echten Projekt-Historie hängen (die sich mit jedem Commit ändert),
// legt jeder Test ein Wegwerf-Repo mit gestellten Commits an.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SKRIPT = resolve(import.meta.dirname, '../.github/scripts/release-notes.py');

let repo;

/** Legt ein leeres Repo an, in dem die gestellten Commits entstehen. */
function repoAnlegen() {
  const pfad = mkdtempSync(join(tmpdir(), 'pp-notes-'));
  const git = (...args) => execFileSync('git', args, { cwd: pfad });
  git('init', '-q');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Test');
  git('commit', '-q', '--allow-empty', '-m', 'chore: Anfang');
  return pfad;
}

/** Setzt einen leeren Commit mit diesem Betreff. */
function commit(betreff) {
  execFileSync('git', ['commit', '-q', '--allow-empty', '-m', betreff], { cwd: repo });
}

/** Ruft das Skript im Wegwerf-Repo auf und gibt die Zeilen zurück. */
function hinweise(ziel = 'testflight', env = {}) {
  const text = execFileSync('python3', [SKRIPT, ziel], {
    cwd: repo,
    encoding: 'utf-8',
    env: { ...process.env, VORGABE: '', SEIT_COMMIT: '', ...env },
  }).trim();
  return text.split('\n').map((z) => z.replace(/^- /, ''));
}

beforeAll(() => {
  repo = repoAnlegen();
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('Interna bleiben draußen', () => {
  it('lässt einen Punkt für Nutzer:innen stehen', () => {
    commit('feat: Abzeichen antippen zeigt die Beschreibung');
    expect(hinweise()).toEqual(['Abzeichen antippen zeigt die Beschreibung']);
  });

  it('filtert Interna am Typ — chore, ci, test, docs, refactor', () => {
    commit('chore: Abhaengigkeiten anheben');
    commit('ci: Tests bei jedem Push laufen lassen');
    commit('test: Scan-Route absichern');
    commit('docs: Projektregeln festhalten');
    commit('refactor: Punktelogik entzerren');
    // Nur der eine echte Punkt aus dem Test davor bleibt übrig.
    expect(hinweise()).toEqual(['Abzeichen antippen zeigt die Beschreibung']);
  });

  it('filtert Interna am Bereich, auch wenn der Typ fix oder feat ist', () => {
    // Das ist der Fehler, um den es geht: `fix(ci): ...` trägt den Typ `fix`
    // und rutschte am Typ-Filter vorbei — die CI-Commits vom 10.09. landeten
    // so in den Testhinweisen.
    commit('fix(ci): Keystore-Angaben an Gradle uebergeben');
    commit('fix(ci): Vergleichsstand ohne Git-Tag ermitteln');
    commit('perf(ci): Android-Build beschleunigen');
    commit('feat(ci): Veroeffentlichung als eigene Action');
    commit('chore(deps): uuid anheben');
    expect(hinweise()).toEqual(['Abzeichen antippen zeigt die Beschreibung']);
  });

  it('behält einen Fix mit fachlichem Bereich', () => {
    // Die Gegenprobe zum Test davor: `fix(items)` betrifft Nutzer:innen und
    // muss stehen bleiben — der Bereichsfilter darf nicht zu weit greifen.
    commit('fix(items): Standardwert von 30 Punkten greifen lassen');
    expect(hinweise()).toEqual([
      'Standardwert von 30 Punkten greifen lassen',
      'Abzeichen antippen zeigt die Beschreibung',
    ]);
  });
});

describe('Vorgabe und Grenzen', () => {
  it('nimmt den eingetippten Text unverändert', () => {
    expect(hinweise('testflight', { VORGABE: 'Bitte den Scanner testen' }))
      .toEqual(['Bitte den Scanner testen']);
  });

  it('kürzt die Vorgabe bei Google Play auf 480 Zeichen', () => {
    // Die Länge allein sagt nichts: 480 beliebige Zeichen kämen damit durch.
    // Geprüft wird deshalb der Inhalt — und zwar mit unterscheidbarem Anfang
    // und Ende, damit auch feststeht, dass VORN gekürzt wird und nicht etwa
    // das Ende genommen.
    const lang = `ANFANG${'a'.repeat(600)}ENDE`;
    const [zeile] = hinweise('play', { VORGABE: lang });
    expect(zeile).toBe(lang.slice(0, 480));
    expect(zeile.startsWith('ANFANG')).toBe(true);
    expect(zeile.endsWith('ENDE')).toBe(false);
  });

  it('meldet sich mit einem Satz, wenn nur Interna anliegen', () => {
    const leer = repoAnlegen();
    const alt = repo;
    repo = leer;
    try {
      commit('ci: nur Innendienst');
      expect(hinweise()).toEqual(['Kleinere Verbesserungen unter der Haube.']);
    } finally {
      repo = alt;
      rmSync(leer, { recursive: true, force: true });
    }
  });
});
