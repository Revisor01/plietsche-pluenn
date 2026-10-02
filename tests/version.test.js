// GET /api/pp/version — welcher Commit auf dem Server läuft.
//
// Die Nachher-Prüfung des Deploys (deploy-verify.py) maß bisher je Migration
// ein Schemamerkmal. Eine reine Änderung an den Hooks war damit nicht zu
// sehen: Lief die Instanz noch auf dem alten Abbild, war das Schema trotzdem
// richtig und der Lauf grün.
//
// Der Commit steht in lib/build.js. Die Datei gibt es nur im Abbild, das
// Dockerfile schreibt sie beim Bauen in pb_hooks/ — also dorthin, von wo
// PocketBase die Hooks tatsächlich lädt. Ein Bind-Mount, der /pb_hooks mit
// einem alten Stand überdeckt (die Falle vom August), überdeckt damit auch
// den Commit, und die Prüfung schlägt an.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const { loadHook } = createRequire(import.meta.url)('./harness.js');

const ROUTE = 'GET /api/pp/version';
const COMMIT = '4b6b2babe7d9c11c1f4a76e41e7051364f56c5b1';

describe('GET /api/pp/version', () => {
  it('liefert den Commit aus dem Abbild', () => {
    const h = loadHook('version.pb.js', {}, { libs: { 'lib/build.js': { commit: COMMIT } } });
    expect(h.call(ROUTE)).toEqual({ status: 200, body: { commit: COMMIT } });
  });

  it('antwortet ohne Anmeldung — die Prüfung im Deploy liest unangemeldet', () => {
    const h = loadHook('version.pb.js', {}, { libs: { 'lib/build.js': { commit: COMMIT } } });
    expect(h.call(ROUTE, { authRecord: null }).status).toBe(200);
  });

  it('liefert einen leeren Commit, wenn die Datei fehlt (lokal, ohne Abbild)', () => {
    // Kein Absturz: Lokal läuft das Upstream-Abbild mit eingehängten Hooks,
    // dort gibt es lib/build.js nicht. Der Deploy erwartet einen echten
    // Commit, ein leerer fällt dort also auf.
    const h = loadHook('version.pb.js');
    expect(h.call(ROUTE)).toEqual({ status: 200, body: { commit: '' } });
  });
});

describe('Das Abbild schreibt den Commit', () => {
  const dockerfile = readFileSync(new URL('../pocketbase/Dockerfile', import.meta.url), 'utf-8');
  const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf-8');

  it('Dockerfile legt lib/build.js in /pb_hooks an, nach dem Kopieren der Hooks', () => {
    const kopieren = dockerfile.indexOf('COPY pb_hooks /pb_hooks');
    const schreiben = dockerfile.indexOf('/pb_hooks/lib/build.js');
    expect(kopieren).toBeGreaterThan(-1);
    expect(schreiben).toBeGreaterThan(kopieren);
  });

  it('Dockerfile bricht ab, wenn kein Commit-Hash übergeben wurde', () => {
    expect(dockerfile).toMatch(/ARG PP_COMMIT/);
    expect(dockerfile).toMatch(/\*\[!0-9a-f\]\*\)[^\n]*exit 1/);
  });

  it('der Deploy übergibt den Commit und prüft ihn danach', () => {
    expect(workflow).toMatch(/PP_COMMIT=\$\{\{ github\.sha \}\}/);
    expect(workflow).toMatch(/ERWARTETER_COMMIT: \$\{\{ github\.sha \}\}/);
    expect(workflow).toMatch(/pocketbase\/pb_hooks\/version\.pb\.js/);
  });
});
