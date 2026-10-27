// Xcode Cloud soll den iOS-Release bauen können (27.10.2026). Dafür liegt
// mobile/ios im Repo, und das Skript nach dem Klonen geht die Schritte des
// GitHub-Release. testflight.yml und release.yml erzeugen ios/ bis zur
// Umstellung weiter mit --clean neu; das überschreibt nur den Stand auf dem
// Runner.

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const pfad = (rel) => resolve(import.meta.dirname, '..', rel);
const lesen = (rel) => readFileSync(pfad(rel), 'utf-8');

const SKRIPT = 'mobile/ios/ci_scripts/ci_post_clone.sh';
const text = lesen(SKRIPT);
const app = JSON.parse(lesen('mobile/app.json'));
const pbx = lesen('mobile/ios/PlietschePlnn.xcodeproj/project.pbxproj');
const plist = lesen('mobile/ios/PlietschePlnn/Info.plist');
const WORKFLOWS = ['testflight.yml', 'release.yml'].map((n) => [n, lesen(`.github/workflows/${n}`)]);

describe('Skript nach dem Klonen', () => {
  it('ist ausführbar und bricht bei jedem Fehler ab', () => {
    expect(statSync(pfad(SKRIPT)).mode & 0o111).not.toBe(0);
    expect(text).toMatch(/^set -euo pipefail$/m);
  });

  it('geht die Schritte des GitHub-Release in dieser Reihenfolge', () => {
    const schritte = ['brew install "node@$LINIE" cocoapods', 'CI_BUILD_NUMBER', 'npm ci --legacy-peer-deps',
      'cp .env.example .env', 'npx expo prebuild --platform ios --no-install --no-clean', 'Print :CFBundleVersion',
      'pod install', 'DEVELOPMENT_TEAM = J459G9CJT5;'];
    const stellen = schritte.map((s) => text.indexOf(s));
    for (const [i, s] of schritte.entries()) expect(stellen[i], s).toBeGreaterThan(-1);
    expect([...stellen].sort((a, b) => a - b)).toEqual(stellen);
  });

  it('räumt das eingecheckte Projekt nicht ab', () => {
    // Ab Expo 57 ist --clean die Vorgabe; ohne --no-clean entstünde ios/ neu.
    const aufrufe = text.split('\n').filter((z) => z.includes('expo prebuild') && !z.trim().startsWith('#'));
    expect(aufrufe).toEqual(['CI=1 npx expo prebuild --platform ios --no-install --no-clean']);
  });

  it('nimmt Node aus .nvmrc, dieselbe Linie wie die Release-Workflows', () => {
    expect(text).toContain("LINIE=$(tr -d '[:space:]' < .nvmrc)");
    const linie = lesen('mobile/.nvmrc').trim();
    expect(linie).toBe('22');
    for (const [name, wf] of WORKFLOWS) expect(wf, name).toMatch(new RegExp(`node-version: ${linie}\\n`));
  });

  it('baut gegen dieselbe Backend-Adresse wie der GitHub-Release', () => {
    const adresse = lesen('mobile/.env.example').match(/^EXPO_PUBLIC_PB_URL=(\S+)$/m)[1];
    for (const [name, wf] of WORKFLOWS) expect(wf, name).toContain(adresse);
  });
});

describe('Build-Nummer aus Xcode Cloud', () => {
  const knoten = text.match(/node -e '\n([\s\S]*?)' "\$MOBILE\/app.json"/)[1];
  function setze(nummer, buildNumber = '53') {
    const datei = join(mkdtempSync(join(tmpdir(), 'xcc-')), 'app.json');
    writeFileSync(datei, JSON.stringify({ expo: { version: '1.0.0', ios: { bundleIdentifier: 'x', buildNumber } } }, null, 2) + '\n');
    const lauf = spawnSync('node', ['-e', knoten, datei], { encoding: 'utf-8', env: { ...process.env, CI_BUILD_NUMBER: nummer } });
    return { code: lauf.status, aus: lauf.stdout + lauf.stderr, app: JSON.parse(readFileSync(datei, 'utf-8')) };
  }

  it('übernimmt eine höhere Nummer in app.json', () => {
    const { code, app: neu } = setze('54');
    expect(code).toBe(0);
    expect(neu.expo.ios).toEqual({ bundleIdentifier: 'x', buildNumber: '54' });
  });

  it.each(['53', '7', '', 'abc'])('bricht bei Build-Nummer %j ab, ohne app.json zu ändern', (nummer) => {
    const { code, aus, app: neu } = setze(nummer);
    expect(code).toBe(1);
    expect(aus).toContain('Build Number');
    expect(neu.expo.ios.buildNumber).toBe('53');
  });
});

describe('Eingechecktes iOS-Projekt', () => {
  it('app.json trägt Untergrenze der Build-Nummer und Team', () => {
    // 53 ist der letzte Build in App Store Connect (07.10.2026).
    expect(app.expo.ios.buildNumber).toBe('53');
    expect(app.expo.ios.appleTeamId).toBe('J459G9CJT5');
    for (const [name, wf] of WORKFLOWS) expect(wf, name).toContain('TEAM_ID: J459G9CJT5');
  });

  it('ist aus app.json erzeugt: Build-Nummer und Version in Info.plist', () => {
    expect(plist).toMatch(new RegExp(`<key>CFBundleVersion</key>\\s*<string>${app.expo.ios.buildNumber}</string>`));
    expect(plist).toMatch(new RegExp(`<key>CFBundleShortVersionString</key>\\s*<string>${app.expo.version}</string>`));
  });

  it('signiert automatisch mit dem Team, in beiden Konfigurationen', () => {
    expect(pbx.split('DEVELOPMENT_TEAM = J459G9CJT5;').length - 1).toBe(2);
    expect(pbx).not.toContain('CODE_SIGN_STYLE = Manual;');
    expect(pbx).not.toContain('PROVISIONING_PROFILE_SPECIFIER');
  });

  it('hat ein geteiltes Schema, das Release archiviert', () => {
    const schema = lesen('mobile/ios/PlietschePlnn.xcodeproj/xcshareddata/xcschemes/PlietschePlnn.xcscheme');
    expect(schema).toMatch(/<ArchiveAction\s+buildConfiguration = "Release"/);
  });

  it('bindet keine Swift-Pakete ein, sonst bräuchte Xcode Cloud eine Package.resolved', () => {
    expect(pbx).not.toMatch(/XC(Remote|Local)SwiftPackageReference/);
  });

  it('versioniert ios/, aber weder Pods noch lokale Node-Pfade', () => {
    expect(lesen('mobile/.gitignore')).not.toMatch(/^\/ios$/m);
    const ios = lesen('mobile/ios/.gitignore');
    expect(ios).toMatch(/^\/Pods\/$/m);
    expect(ios).toMatch(/^\.xcode\.env\.local$/m);
    expect(ios).toMatch(/^build\/$/m);
  });
});

describe('GitHub-Release bis zur Umstellung', () => {
  it.each(WORKFLOWS)('%s erzeugt ios/ weiter neu und signiert automatisch', (_, wf) => {
    expect(wf).toContain('npx expo prebuild --platform ios --clean --no-install');
    expect(wf).toContain('CODE_SIGN_STYLE=Automatic');
  });
});
