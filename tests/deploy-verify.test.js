// Tests für .github/scripts/deploy-verify.py — die Nachher-Prüfung des Deploys.
//
// Das Skript ist die einzige Stelle im Ablauf, die merkt, dass ein Deploy
// nicht angekommen ist. Genau das hat im August gefehlt: Die Instanz lief
// vier Wochen auf einem alten Stand, /api/health meldete durchgehend „gesund",
// und ein als behoben geführter Sicherheitsfehler stand weiter offen. Ist
// dieses Skript falsch, ist der grüne Lauf wieder wertlos.
//
// Gestellt werden die Antworten von einem kleinen HTTP-Server, der als
// EIGENER PROZESS läuft (tests/helper/pb-stub.mjs) — keine echte PocketBase,
// keine Produktion. Der eigene Prozess ist nötig und nicht Geschmackssache:
// Läuft der Server im Test-Worker und das Skript wird synchron aufgerufen,
// blockiert der Aufruf die Ereignisschleife, der Server kommt nie dazu zu
// antworten, und der Testlauf hängt. Das Skript wird deshalb asynchron
// aufgerufen und der Server liegt daneben.

import { describe, it, expect, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const ausfuehren = promisify(execFile);

const SKRIPT = resolve(import.meta.dirname, '../.github/scripts/deploy-verify.py');
const STUB = resolve(import.meta.dirname, 'helper/pb-stub.mjs');

/** Der Stand, den eine richtig ausgelieferte Instanz liefert. */
function standRichtig() {
  const leereListe = { page: 1, perPage: 30, totalItems: 0, totalPages: 0, items: [] };
  return {
    '/api/collections/store_secrets/records': {
      status: 403,
      koerper: { code: 403, message: 'Only superusers can perform this action.' },
    },
    '/api/collections/store/records': { status: 200, koerper: leereListe },
    '/api/collections/items/records': { status: 200, koerper: leereListe },
    '/api/collections/action_counts/records': { status: 200, koerper: leereListe },
    '/api/health': {
      status: 200,
      koerper: { message: 'API is healthy.', code: 200, data: { canBackup: true } },
    },
  };
}

let laufend = [];

/**
 * Startet den Stub-Server als eigenen Prozess und gibt seine Basis-URL zurück.
 * `warmlaufAbrufe` lässt die ersten n Abrufe je Pfad mit 503 beantworten —
 * damit lässt sich ein Container nachstellen, der noch startet.
 */
async function serverStarten(antworten, warmlaufAbrufe = 0) {
  const prozess = spawn('node', [STUB], { stdio: ['pipe', 'pipe', 'inherit'] });
  laufend.push(prozess);

  prozess.stdin.end(JSON.stringify({ antworten, warmlaufAbrufe }));

  const port = await new Promise((fertig, scheitern) => {
    let gelesen = '';
    prozess.stdout.on('data', (stueck) => {
      gelesen += stueck;
      const zeile = gelesen.split('\n')[0];
      if (gelesen.includes('\n')) fertig(Number(zeile));
    });
    prozess.on('error', scheitern);
    prozess.on('exit', (code) => scheitern(new Error(`Stub beendet mit ${code}`)));
  });

  return `http://127.0.0.1:${port}`;
}

afterEach(() => {
  for (const prozess of laufend) prozess.kill();
  laufend = [];
});

/**
 * Ruft das Skript auf und gibt { code, ausgabe } zurück.
 * Ohne Wartezeit zwischen den Runden — sonst dauerte jeder Fehlerfall Minuten.
 */
async function pruefen(basis, { versuche = 2, abstand = 0, commit } = {}) {
  const umgebung = {
    ...process.env,
    VERIFY_VERSUCHE: String(versuche),
    VERIFY_ABSTAND: String(abstand),
    VERIFY_ZEITLIMIT: '5',
  };
  // Nur gesetzt, wenn der Test es will — ein Wert aus der Umgebung des
  // Testlaufs darf das Ergebnis nicht verschieben.
  delete umgebung.ERWARTETER_COMMIT;
  if (commit !== undefined) umgebung.ERWARTETER_COMMIT = commit;
  try {
    const { stdout } = await ausfuehren('python3', [SKRIPT, basis], { env: umgebung });
    return { code: 0, ausgabe: stdout };
  } catch (fehler) {
    return { code: fehler.code, ausgabe: `${fehler.stdout || ''}${fehler.stderr || ''}` };
  }
}

describe('Erfolg nur bei vollständiger Übereinstimmung', () => {
  it('meldet grün, wenn alle fünf Merkmale stimmen', async () => {
    const basis = await serverStarten(standRichtig());
    const { code, ausgabe } = await pruefen(basis);
    expect(code).toBe(0);
    expect(ausgabe).toContain('Alle 5 Merkmale stimmen');
  });
});

describe('Fehlendes Schemamerkmal', () => {
  it('erkennt eine Migration, die nicht durchgelaufen ist', async () => {
    // store_secrets gibt es noch nicht: PocketBase antwortet auf eine
    // unbekannte Sammlung mit 404, nicht mit 403. Das ist der Stand vor
    // 1782690000_store_secret_collection — genau die Migration, deren Fehlen
    // vier Wochen lang niemandem auffiel.
    const stand = standRichtig();
    delete stand['/api/collections/store_secrets/records'];
    const basis = await serverStarten(stand);

    const { code, ausgabe } = await pruefen(basis);
    expect(code).toBe(1);
    expect(ausgabe).toContain(
      '[FEHLT] /api/collections/store_secrets/records: HTTP 404, erwartet 403');
    expect(ausgabe).toContain('1782690000_store_secret_collection');
    expect(ausgabe).toContain('stimmt NICHT mit dem Repo ueberein');
  });

  it('erkennt eine Sammlung, die unangemeldet 200 liefert statt 403', async () => {
    // Der gefährlichere Sonderfall derselben Klasse: store_secrets existiert,
    // ist aber lesbar. Ein Skript, das nur „antwortet die Route" prüft, wäre
    // hier grün — und das Türgeheimnis stünde offen im Netz.
    const stand = standRichtig();
    stand['/api/collections/store_secrets/records'] = {
      status: 200,
      koerper: {
        page: 1, perPage: 30, totalItems: 1, totalPages: 1,
        items: [{ checkin_qr_secret: 'geheim' }],
      },
    };
    const basis = await serverStarten(stand);

    const { code, ausgabe } = await pruefen(basis);
    expect(code).toBe(1);
    expect(ausgabe).toContain(
      '[FEHLT] /api/collections/store_secrets/records: HTTP 200, erwartet 403');
  });
});

describe('Offene Sammlung — die Falle mit dem Statuscode', () => {
  it('erkennt eine offene Sammlung, die mit 200 und Treffern antwortet', async () => {
    // Das ist der Kern: PocketBase liefert bei einer Regel, die nichts
    // durchlässt, HTTP 200 mit leerer Liste. Eine Sammlung ganz ohne
    // Leseregel liefert ebenfalls 200 — nur mit Inhalt. Wer auf Statuscodes
    // prüft, hält die offene Sammlung für geschlossen.
    const stand = standRichtig();
    stand['/api/collections/items/records'] = {
      status: 200,
      koerper: {
        page: 1, perPage: 30, totalItems: 15, totalPages: 1,
        items: [{ id: 'abc', location: 'bei Fam. Petersen, Deichstr. 4' }],
      },
    };
    const basis = await serverStarten(stand);

    const { code, ausgabe } = await pruefen(basis);
    expect(code).toBe(1);
    expect(ausgabe).toContain(
      '[OFFEN] /api/collections/items/records: HTTP 200, aber totalItems=15 statt 0');
    expect(ausgabe).toContain('1782710000_tighten_read_rules');
  });

  it('erkennt auch zwei durchgelassene Zeilen in action_counts', async () => {
    const stand = standRichtig();
    stand['/api/collections/action_counts/records'] = {
      status: 200,
      koerper: { page: 1, perPage: 30, totalItems: 2, totalPages: 1, items: [] },
    };
    const basis = await serverStarten(stand);

    const { code, ausgabe } = await pruefen(basis);
    expect(code).toBe(1);
    expect(ausgabe).toContain(
      '[OFFEN] /api/collections/action_counts/records: HTTP 200, aber totalItems=2 statt 0');
  });

  it('verlangt eine Listenantwort — eine 200 ohne totalItems zählt nicht als Erfolg', async () => {
    const stand = standRichtig();
    stand['/api/collections/store/records'] = { status: 200, koerper: { message: 'ok' } };
    const basis = await serverStarten(stand);

    const { code, ausgabe } = await pruefen(basis);
    expect(code).toBe(1);
    expect(ausgabe).toContain('keine Listenantwort');
  });
});

describe('Langsam startender Server', () => {
  it('wartet den Neustart ab und meldet dann grün', async () => {
    // Der Webhook antwortet sofort, der Container braucht Sekunden: Image
    // ziehen, starten, Migrationen ausführen. Die ersten beiden Abrufe je
    // Pfad laufen ins Leere (503, wie ein Reverse Proxy ohne Backend),
    // danach steht der richtige Stand.
    const basis = await serverStarten(standRichtig(), 2);

    const { code, ausgabe } = await pruefen(basis, { versuche: 5 });
    expect(code).toBe(0);
    expect(ausgabe).toContain('Alle 5 Merkmale stimmen');
  });

  it('gibt nach der letzten Runde auf, wenn der Stand falsch bleibt', async () => {
    // Die Gegenprobe: Warten allein darf nicht grün machen.
    const stand = standRichtig();
    stand['/api/collections/items/records'] = {
      status: 200,
      koerper: { page: 1, perPage: 30, totalItems: 15, totalPages: 1, items: [] },
    };
    const basis = await serverStarten(stand);

    const { code, ausgabe } = await pruefen(basis, { versuche: 3 });
    expect(code).toBe(1);
    expect(ausgabe).toContain('Nach 3 Runden');
  });
});

describe('Aufruf', () => {
  /** Ruft das Skript mit beliebigen Argumenten auf und gibt den Rückgabewert. */
  async function aufruf(...args) {
    try {
      await ausfuehren('python3', [SKRIPT, ...args]);
      return 0;
    } catch (fehler) {
      return fehler.code;
    }
  }

  it('meldet einen Aufruffehler, wenn die Basis-URL fehlt', async () => {
    expect(await aufruf()).toBe(2);
  });

  it('meldet einen Aufruffehler statt eines Stacktrace bei unbrauchbarer URL', async () => {
    // 2, nicht 1: Ein Tippfehler im Workflow ist ein Aufruffehler und kein
    // „Deploy nicht angekommen" — sonst sucht man den Fehler auf dem Server.
    expect(await aufruf('')).toBe(2);
    expect(await aufruf('pb.example.invalid')).toBe(2);
  });
});

describe('Commit der geladenen Hooks', () => {
  // Bis hierher maß die Prüfung nur Schemamerkmale. Eine Änderung allein an
  // pb_hooks war damit unsichtbar: Lief noch das alte Abbild, stimmte das
  // Schema trotzdem, und der Lauf war grün. Mit ERWARTETER_COMMIT vergleicht
  // das Skript zusätzlich, was GET /api/pp/version meldet.
  const NEU = '4b6b2babe7d9c11c1f4a76e41e7051364f56c5b1';
  const ALT = 'b2ddb7339df767707bad46a1b9d14f0be3f363e4';

  const mitVersion = (commit) => ({
    ...standRichtig(),
    '/api/pp/version': { status: 200, koerper: { commit } },
  });

  it('meldet grün, wenn der ausgelieferte Commit läuft', async () => {
    const basis = await serverStarten(mitVersion(NEU));
    const { code, ausgabe } = await pruefen(basis, { commit: NEU });
    expect(code).toBe(0);
    expect(ausgabe).toContain(`[ok]    /api/pp/version: Commit ${NEU.slice(0, 7)}`);
    expect(ausgabe).toContain('Alle 6 Merkmale stimmen');
  });

  it('erkennt den alten Stand, obwohl das Schema stimmt', async () => {
    // Der Fall, für den es die Route gibt: Schema richtig, Hooks alt.
    const basis = await serverStarten(mitVersion(ALT));
    const { code, ausgabe } = await pruefen(basis, { commit: NEU });
    expect(code).toBe(1);
    expect(ausgabe).toContain(
      `[ALT]   /api/pp/version: laeuft auf ${ALT.slice(0, 7)}, erwartet ${NEU.slice(0, 7)}`);
    expect(ausgabe).toContain('stimmt NICHT mit dem Repo ueberein');
  });

  it('erkennt Hooks ohne die Route (404)', async () => {
    const basis = await serverStarten(standRichtig());
    const { code, ausgabe } = await pruefen(basis, { commit: NEU });
    expect(code).toBe(1);
    expect(ausgabe).toContain('[FEHLT] /api/pp/version: HTTP 404, erwartet 200');
  });

  it('wertet einen leeren Commit nicht als Treffer', async () => {
    // Leer meldet die Route, wenn lib/build.js fehlt — ein Abbild, das nicht
    // über den Deploy gebaut wurde.
    const basis = await serverStarten(mitVersion(''));
    const { code, ausgabe } = await pruefen(basis, { commit: NEU });
    expect(code).toBe(1);
    expect(ausgabe).toContain('[ALT]   /api/pp/version: laeuft auf (leer)');
  });

  it('bleibt ohne ERWARTETER_COMMIT bei den fünf Schemamerkmalen', async () => {
    // Der Aufruf von Hand (docs/deploy.md) kennt keinen Commit.
    const basis = await serverStarten(standRichtig());
    const { code, ausgabe } = await pruefen(basis);
    expect(code).toBe(0);
    expect(ausgabe).toContain('Alle 5 Merkmale stimmen');
    expect(ausgabe).not.toContain('/api/pp/version');
  });
});
