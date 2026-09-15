// Tests für den Freigabestatus in .github/scripts/upload-play.py.
//
// Der Status entscheidet, ob eine Fassung sofort bei den Nutzer:innen landet
// (`completed`) oder erst als Entwurf in der Play Console liegt (`draft`).
// Beides falsch herum tut weh: `completed` auf eine noch nie veröffentlichte
// App lehnt Google ab („Only releases with status draft may be created on draft
// app.") — und zwar erst NACH dem fertigen Build und dem Upload, also nach
// einer Dreiviertelstunde Rechenzeit. `draft` im Normalbetrieb wäre umgekehrt
// stiller: Der Lauf endet grün, aber bei den Tester:innen kommt nichts an.
//
// Getestet wird das Skript als Prozess, wie der Workflow es aufruft. Es geht
// dabei nie ins Netz: Der Statuscheck sitzt vor dem ersten Google-Aufruf, und
// genau das ist eine der Zusicherungen hier. Die mitgegebene
// Service-Account-Datei ist Attrappe — würde das Skript sie benutzen, bräche
// es mit einer anderen Meldung ab, und der Test fiele auf.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SKRIPT = resolve(import.meta.dirname, '../.github/scripts/upload-play.py');

let ablage;
let saDatei;
let aabDatei;
let notizen;

beforeAll(() => {
  ablage = mkdtempSync(join(tmpdir(), 'pp-play-'));
  // Attrappen. Inhalt und Form sind bewusst unbrauchbar: Kommt das Skript bis
  // zum Anmelden, scheitert es anders als am Statuscheck — und der Test merkt es.
  saDatei = join(ablage, 'sa.json');
  aabDatei = join(ablage, 'app.aab');
  notizen = join(ablage, 'notes.txt');
  writeFileSync(saDatei, '{}');
  writeFileSync(aabDatei, 'kein echtes Paket');
  writeFileSync(notizen, 'Kleinere Verbesserungen unter der Haube.');
});

afterAll(() => {
  rmSync(ablage, { recursive: true, force: true });
});

/**
 * Ruft das Skript mit dem gegebenen Status auf. `status === null` heißt: Die
 * Variable wird gar nicht gesetzt — der Vorgabefall.
 */
function aufruf(status) {
  const env = { ...process.env };
  delete env.PLAY_RELEASE_STATUS;
  if (status !== null) env.PLAY_RELEASE_STATUS = status;
  return spawnSync('python3', [SKRIPT, saDatei, aabDatei, notizen, 'internal', 'validate'], {
    encoding: 'utf-8',
    env,
    timeout: 30_000,
  });
}

describe('Unbekannter Status bricht ab', () => {
  it('nennt den falschen Wert und die erlaubten', () => {
    const { status, stderr } = aufruf('fertig');
    expect(status).toBe(2);
    expect(stderr).toContain("'fertig'");
    expect(stderr).toContain('draft');
    expect(stderr).toContain('completed');
  });

  it('lässt auch einen echten Google-Status nicht durch, den dieser Weg nicht bedienen kann', () => {
    // `inProgress` und `halted` kennt die Play-API, sie brauchen aber eine
    // userFraction. Ohne die scheitert erst Google — und zwar nach dem Upload.
    // Deshalb müssen sie hier hängen bleiben, nicht durchgereicht werden.
    expect(aufruf('inProgress').status).toBe(2);
    expect(aufruf('halted').status).toBe(2);
  });

  it('bricht ab, bevor irgendetwas bei Google passiert', () => {
    // Die entscheidende Eigenschaft: Der Check sitzt VOR dem Anmelden. Wäre er
    // dahinter, liefe erst ein Token-Abruf mit der Attrappe — dann stünde eine
    // Meldung über den fehlenden Schlüssel im Fehlerkanal, nicht unsere.
    const { status, stderr } = aufruf('Draft');
    expect(status).toBe(2);
    expect(stderr).toContain('PLAY_RELEASE_STATUS');
    // Nichts von openssl, JSON-Schlüsseln oder HTTP — es wurde nicht gestartet.
    expect(stderr).not.toContain('client_email');
    expect(stderr).not.toContain('Traceback');
  });

  it('nimmt einen leeren Wert nicht als Status, sondern als „nicht gesetzt"', () => {
    // Eine nicht ausgefüllte Workflow-Eingabe kommt als leerer String an. Als
    // Status wäre das ein Abbruch mitten in der Veröffentlichung; gemeint ist
    // aber die Vorgabe. Also muss der Lauf hier weiterkommen — bis zum
    // Anmelden, das mit der Attrappe scheitert.
    const { status, stderr } = aufruf('');
    expect(status).not.toBe(2);
    expect(stderr).not.toContain('PLAY_RELEASE_STATUS');
  });
});

describe('Gültige Werte kommen durch', () => {
  // Gegenprobe zum Abbruch oben: `draft` und `completed` dürfen NICHT am
  // Statuscheck hängen bleiben. Sie laufen weiter bis zum Anmelden und
  // scheitern dort an der Attrappe — erkennbar daran, dass der Abbruchcode 2
  // und unsere Meldung ausbleiben.
  for (const wert of ['draft', 'completed']) {
    it(`lässt ${wert} passieren`, () => {
      const { status, stderr } = aufruf(wert);
      expect(status).not.toBe(2);
      expect(stderr).not.toContain('PLAY_RELEASE_STATUS');
    });
  }

  it('ist die Vorgabe completed, wenn nichts gesetzt ist', () => {
    // Der bestehende interne Weg setzt die Variable nicht. Er muss sich
    // weiterhin genau so verhalten wie vorher, als "completed" fest im Skript
    // stand — also durchlaufen und nicht am Statuscheck hängen.
    const { status, stderr } = aufruf(null);
    expect(status).not.toBe(2);
    expect(stderr).not.toContain('PLAY_RELEASE_STATUS');
  });
});

describe('Der Status steht wirklich im Release, nicht mehr fest im Skript', () => {
  // Die Tests oben zeigen, WELCHE Werte durchkommen — nicht, dass der Wert
  // danach auch benutzt wird. Ohne diese Prüfung bliebe ein fest verdrahtetes
  // "completed" im Release-Rumpf unbemerkt, und `draft` wäre wirkungslos:
  // Die erste Veröffentlichung scheiterte weiter, obwohl der Lauf draft meldet.
  const quelle = readFileSync(SKRIPT, 'utf-8');

  it('setzt status aus der Variablen', () => {
    expect(quelle).toContain('"status": STATUS');
  });

  it('hat keinen fest verdrahteten Status mehr im Release', () => {
    expect(quelle).not.toContain('"status": "completed"');
    expect(quelle).not.toContain('"status": "draft"');
  });
});

describe('Die Workflows reichen den Status an das Skript weiter', () => {
  // Das Skript kann noch so richtig sein — wenn kein Workflow die Variable
  // setzt, ist `draft` über die Oberfläche nicht erreichbar, und die erste
  // Veröffentlichung in die Produktionsspur bleibt unmöglich.
  const workflows = {
    'play-internal.yml': resolve(import.meta.dirname, '../.github/workflows/play-internal.yml'),
    'release.yml': resolve(import.meta.dirname, '../.github/workflows/release.yml'),
  };

  for (const [name, pfad] of Object.entries(workflows)) {
    const text = readFileSync(pfad, 'utf-8');

    it(`${name} bietet die Wahl zwischen draft und completed an`, () => {
      const block = text.match(/freigabe:[\s\S]*?default: \w+/);
      expect(block).not.toBeNull();
      expect(block[0]).toContain('- completed');
      expect(block[0]).toContain('- draft');
    });

    it(`${name} behält completed als Vorgabe`, () => {
      // draft soll bewusst gewählt werden. Als Vorgabe blieben Testfassungen
      // und Veröffentlichungen unbemerkt in der Konsole liegen.
      const block = text.match(/freigabe:[\s\S]*?default: (\w+)/);
      expect(block[1]).toBe('completed');
    });

    it(`${name} gibt die Eingabe an upload-play.py weiter`, () => {
      expect(text).toContain('PLAY_RELEASE_STATUS: ${{ inputs.freigabe }}');
    });
  }

  it('play-internal.yml bietet die Produktionsspur an', () => {
    const block = workflowSpur(workflows['play-internal.yml']);
    expect(block).toContain('- production');
    expect(block).toContain('- internal');
  });

  it('play-internal.yml behält internal als Vorgabe-Spur', () => {
    // Produktion darf nur durch eine bewusste Auswahl erreichbar sein.
    const block = workflowSpur(workflows['play-internal.yml']);
    expect(block.match(/default: (\w+)/)[1]).toBe('internal');
  });
});

/** Schneidet den Block der Eingabe `spur` aus einer Workflow-Datei. */
function workflowSpur(pfad) {
  const text = readFileSync(pfad, 'utf-8');
  const block = text.match(/spur:[\s\S]*?default: \w+/);
  if (!block) throw new Error(`Eingabe "spur" in ${pfad} nicht gefunden`);
  return block[0];
}
