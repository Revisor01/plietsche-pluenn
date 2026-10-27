// Tests für die Firebase-Konfiguration des Android-Builds.
//
// Ohne google-services.json bekommt die Android-App keinen Push-Token, und das
// fällt nur in der Datenbank auf (0 Android-Geräte). Deshalb: app.json verweist
// auf die Datei, beide Android-Workflows schreiben sie vor dem prebuild aus dem
// Secret, und das Skript lässt nur eine Datei für das richtige Paket durch.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const pfad = (rel) => resolve(import.meta.dirname, '..', rel);
const lesen = (rel) => readFileSync(pfad(rel), 'utf-8');
const SKRIPT = pfad('.github/scripts/google-services.py');
const PAKET = 'de.godsapp.plietschepluenn';

const konfig = (...pakete) => ({
  project_info: { project_id: 'plietsche-pluenn', project_number: '1' },
  client: pakete.map((p) => ({ client_info: { android_client_info: { package_name: p } } })),
});
const b64 = (obj) => Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64');

let ordner;
beforeEach(() => { ordner = mkdtempSync(join(tmpdir(), 'gs-')); });
afterEach(() => rmSync(ordner, { recursive: true, force: true }));

function schreiben(secret) {
  const ziel = join(ordner, 'google-services.json');
  const env = { ...process.env };
  delete env.GOOGLE_SERVICES_JSON_BASE64;
  if (secret !== undefined) env.GOOGLE_SERVICES_JSON_BASE64 = secret;
  const r = spawnSync('python3', ['-I', SKRIPT, ziel, PAKET], { env, encoding: 'utf-8' });
  return { code: r.status, fehler: r.stderr, ziel, da: existsSync(ziel) };
}

describe('google-services.py', () => {
  it('schreibt die Datei, wenn sie das Paket kennt', () => {
    const inhalt = konfig('com.plietschepluenn', PAKET);
    const r = schreiben(b64(inhalt));
    expect(r.code).toBe(0);
    expect(JSON.parse(readFileSync(r.ziel, 'utf-8'))).toEqual(inhalt);
  });

  it('bricht ab, wenn nur der alte Paketname drinsteht', () => {
    const r = schreiben(b64(konfig('com.plietschepluenn')));
    expect(r.code).toBe(1);
    expect(r.fehler).toContain(`kennt das Paket ${PAKET} nicht`);
    expect(r.da).toBe(false);
  });

  it('bricht ab, wenn das Secret fehlt oder leer ist', () => {
    for (const secret of [undefined, '', '  ']) {
      const r = schreiben(secret);
      expect(r.code).toBe(1);
      expect(r.fehler).toContain('GOOGLE_SERVICES_JSON_BASE64 fehlt');
      expect(r.da).toBe(false);
    }
  });

  it('bricht ab, wenn das Secret kein base64-JSON ist', () => {
    for (const secret of ['kein base64!', b64('{kaputt')]) {
      const r = schreiben(secret);
      expect(r.code).toBe(1);
      expect(r.fehler).toContain('kein base64-kodiertes JSON');
      expect(r.da).toBe(false);
    }
  });
});

describe('Einbindung', () => {
  it('app.json verweist für Android auf ./google-services.json', () => {
    const app = JSON.parse(lesen('mobile/app.json')).expo;
    expect(app.android.package).toBe(PAKET);
    expect(app.android.googleServicesFile).toBe('./google-services.json');
  });

  it('die Datei ist von Git ausgeschlossen', () => {
    const r = spawnSync('git', ['check-ignore', '-q', 'mobile/google-services.json'], { cwd: pfad('.') });
    expect(r.status).toBe(0);
  });

  for (const wf of ['play-internal.yml', 'release.yml']) {
    it(`${wf} schreibt die Datei aus dem Secret vor dem Android-prebuild`, () => {
      const text = lesen(`.github/workflows/${wf}`);
      const schritt = text.indexOf('- name: Firebase-Konfiguration ablegen');
      const prebuild = text.indexOf('npx expo prebuild --platform android');
      expect(schritt).toBeGreaterThan(-1);
      expect(prebuild).toBeGreaterThan(schritt);
      const block = text.slice(schritt, prebuild);
      expect(block).toContain('GOOGLE_SERVICES_JSON_BASE64: ${{ secrets.GOOGLE_SERVICES_JSON_BASE64 }}');
      expect(block).toContain('python3 .github/scripts/google-services.py mobile/google-services.json "$PACKAGE"');
      expect(text).toMatch(/^ {2}PACKAGE: de\.godsapp\.plietschepluenn$/m);
    });
  }
});
