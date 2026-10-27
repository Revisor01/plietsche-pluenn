// .github/scripts/deploy-verify.py gegen einen Stub-Server im eigenen Prozess (tests/helper/pb-stub.mjs), sonst blockiert die Ereignisschleife.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const ausfuehren = promisify(execFile);

// Großzügige Zeitgrenze, auf einem ausgelasteten Rechner dauerte ein Test fast 5 s.
vi.setConfig({ testTimeout: 20_000 });

const SKRIPT = resolve(import.meta.dirname, '../.github/scripts/deploy-verify.py');
const STUB = resolve(import.meta.dirname, 'helper/pb-stub.mjs');

/** Der Stand, den eine richtig ausgelieferte Instanz liefert. */
function standRichtig() {
  const leereListe = { page: 1, perPage: 30, totalItems: 0, totalPages: 0, items: [] };
  return {
    '/api/collections/store_secrets/records': {
      status: 403,
      koerper: { status: 403, message: 'Only superusers can perform this action.', data: {} },
    },
    '/api/collections/store/records': { status: 200, koerper: leereListe },
    '/api/collections/items/records': { status: 200, koerper: leereListe },
    '/api/collections/action_counts/records': { status: 200, koerper: leereListe },
    // Superuser ab 0.23: 403, unter 0.22: 404.
    '/api/collections/_superusers/records': {
      status: 403,
      koerper: { status: 403, message: 'Only superusers can perform this action.', data: {} },
    },
    '/api/health': {
      status: 200,
      koerper: { message: 'API is healthy.', code: 200, data: { canBackup: true } },
    },
  };
}

let laufend = [];

/** Startet den Stub als eigenen Prozess; `warmlaufAbrufe` beantwortet die ersten n Abrufe mit 503. */
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

/** Ruft das Skript ohne Wartezeit auf und gibt { code, ausgabe } zurück. */
async function pruefen(basis, { versuche = 2, abstand = 0, commit } = {}) {
  const umgebung = {
    ...process.env,
    VERIFY_VERSUCHE: String(versuche),
    VERIFY_ABSTAND: String(abstand),
    VERIFY_ZEITLIMIT: '5',
  };
  // Nur gesetzt, wenn der Test es will.
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
  it('meldet grün, wenn alle sechs Merkmale stimmen', async () => {
    const basis = await serverStarten(standRichtig());
    const { code, ausgabe } = await pruefen(basis);
    expect(code).toBe(0);
    expect(ausgabe).toContain('Alle 6 Merkmale stimmen');
  });
});

describe('Fehlendes Schemamerkmal', () => {
  it('erkennt eine Migration, die nicht durchgelaufen ist', async () => {
    // Unbekannte Sammlung gibt 404, nicht 403.
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
    // store_secrets existiert, ist aber lesbar.
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

describe('PocketBase-Version', () => {
  it('erkennt eine Instanz, die noch auf 0.22 läuft', async () => {
    // Ohne diese Zeile wäre das alte Abbild fünfmal grün.
    const stand = standRichtig();
    delete stand['/api/collections/_superusers/records'];
    const basis = await serverStarten(stand);

    const { code, ausgabe } = await pruefen(basis);
    expect(code).toBe(1);
    expect(ausgabe).toContain(
      '[FEHLT] /api/collections/_superusers/records: HTTP 404, erwartet 403');
    expect(ausgabe).toContain('PocketBase 0.40');
  });

  it('erkennt eine offene _superusers-Sammlung', async () => {
    const stand = standRichtig();
    stand['/api/collections/_superusers/records'] = {
      status: 200,
      koerper: { page: 1, perPage: 30, totalItems: 1, totalPages: 1, items: [] },
    };
    const basis = await serverStarten(stand);

    const { code, ausgabe } = await pruefen(basis);
    expect(code).toBe(1);
    expect(ausgabe).toContain(
      '[FEHLT] /api/collections/_superusers/records: HTTP 200, erwartet 403');
  });
});

describe('Offene Sammlung — die Falle mit dem Statuscode', () => {
  it('erkennt eine offene Sammlung, die mit 200 und Treffern antwortet', async () => {
    // 200 mit Inhalt ist eine offene Sammlung.
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
    // Die ersten zwei Abrufe je Pfad laufen auf 503 wie beim Neustart.
    const basis = await serverStarten(standRichtig(), 2);

    const { code, ausgabe } = await pruefen(basis, { versuche: 5 });
    expect(code).toBe(0);
    expect(ausgabe).toContain('Alle 6 Merkmale stimmen');
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
    // 2 für Aufruffehler, nicht 1, sonst sucht man auf dem Server.
    expect(await aufruf('')).toBe(2);
    expect(await aufruf('pb.example.invalid')).toBe(2);
  });
});

describe('Commit der geladenen Hooks', () => {
  // Mit ERWARTETER_COMMIT wird auch eine Änderung nur an pb_hooks sichtbar.
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
    expect(ausgabe).toContain('Alle 7 Merkmale stimmen');
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
    // Leer, wenn lib/build.js fehlt.
    const basis = await serverStarten(mitVersion(''));
    const { code, ausgabe } = await pruefen(basis, { commit: NEU });
    expect(code).toBe(1);
    expect(ausgabe).toContain('[ALT]   /api/pp/version: laeuft auf (leer)');
  });

  it('bleibt ohne ERWARTETER_COMMIT bei den sechs Schemamerkmalen', async () => {
    // Der Aufruf von Hand kennt keinen Commit.
    const basis = await serverStarten(standRichtig());
    const { code, ausgabe } = await pruefen(basis);
    expect(code).toBe(0);
    expect(ausgabe).toContain('Alle 6 Merkmale stimmen');
    expect(ausgabe).not.toContain('/api/pp/version');
  });
});
