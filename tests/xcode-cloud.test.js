// Xcode Cloud baut den iOS-Release. Dafür liegt mobile/ios im Repo, das Skript
// nach dem Klonen bereitet Abhängigkeiten, Build-Nummer und Pods vor, und
// testflight.yml und release.yml starten den Build über den Baustein.

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
const ohneKommentare = (t) => t.split('\n').filter((z) => !z.trim().startsWith('#')).join('\n');

/** Die Jobs eines Workflows: Name und Text bis zum nächsten Job, ohne Kommentare. */
function jobs(wf) {
  const teil = wf.slice(wf.indexOf('\njobs:\n') + '\njobs:\n'.length);
  const koepfe = [...teil.matchAll(/^ {2}([A-Za-z0-9_-]+):\s*$/gm)];
  return Object.fromEntries(
    koepfe.map((k, i) => [k[1], ohneKommentare(teil.slice(k.index, i + 1 < koepfe.length ? koepfe[i + 1].index : undefined))]),
  );
}

describe('Skript nach dem Klonen', () => {
  it('ist ausführbar und bricht bei jedem Fehler ab', () => {
    expect(statSync(pfad(SKRIPT)).mode & 0o111).not.toBe(0);
    expect(text).toMatch(/^set -euo pipefail$/m);
  });

  it('geht die Schritte in dieser Reihenfolge', () => {
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

  it('nimmt Node aus .nvmrc, dieselbe Linie wie die Android-Fassungen', () => {
    expect(text).toContain("LINIE=$(tr -d '[:space:]' < .nvmrc)");
    const linie = lesen('mobile/.nvmrc').trim();
    expect(linie).toBe('26');
    for (const name of ['release.yml', 'play-internal.yml']) {
      expect(lesen(`.github/workflows/${name}`), name).toMatch(new RegExp(`node-version: ${linie}\\n`));
    }
  });

  it('baut gegen dieselbe Backend-Adresse wie die Android-Fassung', () => {
    // Beide Plattformen sprechen mit der Produktion.
    const adresse = lesen('mobile/.env.example').match(/^EXPO_PUBLIC_PB_URL=(\S+)$/m)[1];
    expect(adresse).toBe('https://pb.xn--plietsche-plnn-rsb.de');
    expect(jobs(lesen('.github/workflows/release.yml')).android).toContain(`EXPO_PUBLIC_PB_URL=${adresse}`);
  });
});

describe('Sperre für expo-modules-jsi unter Xcode 27', () => {
  const knoten = text.match(/node -e '\n([^']*)' "\$\(xcodebuild -version/)[1];
  const pruefe = (xcode, jsi) => {
    const lauf = spawnSync('node', ['-e', knoten, xcode, jsi], { encoding: 'utf-8' });
    return { code: lauf.status, aus: lauf.stdout + lauf.stderr };
  };

  it('prüft nach npm ci und vor prebuild', () => {
    const stellen = ['npm ci --legacy-peer-deps', 'xcodebuild -version', 'npx expo prebuild'].map((s) => text.indexOf(s));
    expect(stellen[0]).toBeGreaterThan(-1);
    expect([...stellen].sort((a, b) => a - b)).toEqual(stellen);
  });

  it.each([['Xcode 27.1', '57.0.4'], ['Xcode 28.0', '56.0.14']])('bricht unter %s mit %s ab', (xcode, jsi) => {
    const { code, aus } = pruefe(xcode, jsi);
    expect(code).toBe(1);
    expect(aus).toContain(`expo-modules-jsi ${jsi} ab (behoben erst ab 57.0.5)`);
  });

  it.each([['Xcode 27.1', '57.0.5'], ['Xcode 27.1', '57.1.3'], ['Xcode 27.1', '58.0.19'], ['Xcode 26.6', '57.0.4']])(
    'lässt %s mit %s bauen', (xcode, jsi) => {
      const { code, aus } = pruefe(xcode, jsi);
      expect(code).toBe(0);
      expect(aus.trim()).toBe(`${xcode}, expo-modules-jsi ${jsi}`);
    });

  it.each([['', '57.1.3'], ['Xcode 27.1', 'abc']])('bricht bei unlesbaren Versionen %j / %j ab', (xcode, jsi) => {
    const { code, aus } = pruefe(xcode, jsi);
    expect(code).toBe(1);
    expect(aus).toContain('Versionen nicht erkannt');
  });

  it('die eingecheckten Stände tragen die Behebung, in Lockfile und Podfile.lock gleich', () => {
    const lock = JSON.parse(lesen('mobile/package-lock.json'));
    const version = lock.packages['node_modules/expo-modules-jsi'].version;
    expect(pruefe('Xcode 27.1', version).code).toBe(0);
    expect(lesen('mobile/ios/Podfile.lock')).toContain(`  - ExpoModulesJSI (${version}):`);
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

const BAUSTEIN = /^ {4}uses: Revisor01\/workflows\/\.github\/workflows\/xcode-cloud\.yml@[0-9a-f]{40} # \d+\.\d+\.\d+$/m;

function ruftBaustein(job) {
  expect(job).toMatch(BAUSTEIN);
  expect(job).toContain('workflow-id: ${{ vars.XCODE_CLOUD_WORKFLOW }}');
  expect(job).toContain('asc-key-id: ${{ secrets.ASC_KEY_ID }}');
  expect(job).toContain('asc-issuer-id: ${{ secrets.ASC_ISSUER_ID }}');
  expect(job).toContain('asc-key-p8: ${{ secrets.ASC_KEY_P8_BASE64 }}');
}

describe('Workflows bauen iOS in Xcode Cloud', () => {
  it.each(WORKFLOWS)('%s baut nicht selbst und braucht kein Distribution-Zertifikat', (_, wf) => {
    for (const wort of ['IOS_DIST_P12_BASE64', 'IOS_P12_PASSWORD', 'security import', 'xcodebuild',
      'allowProvisioningUpdates', 'runs-on: macos', 'expo prebuild --platform ios', 'asc-build-number.py']) {
      expect(wf, wort).not.toContain(wort);
    }
  });

  it('das Skript für die Build-Nummer aus App Store Connect ist weg', () => {
    expect(existsSync(pfad('.github/scripts/asc-build-number.py'))).toBe(false);
  });

  it('release.yml: iOS über den Baustein, nach der Versionsprüfung, ohne Probelauf', () => {
    const j = jobs(lesen('.github/workflows/release.yml'));
    ruftBaustein(j.ios);
    expect(j.ios).toContain('needs: pruefung');
    expect(j.ios).toContain("if: ${{ inputs.plattformen != 'nur Android' && !inputs.probelauf }}");
    expect(j['ios-zusammenfassung']).toContain('BUILD_NUMMER: ${{ needs.ios.outputs.build-nummer }}');
    expect(j['ios-zusammenfassung']).toContain("if: ${{ always() && inputs.plattformen != 'nur Android' && !inputs.probelauf }}");
  });

  it('testflight.yml: Bau über den Baustein, danach die Testhinweise zur gemeldeten Nummer', () => {
    const j = jobs(lesen('.github/workflows/testflight.yml'));
    ruftBaustein(j.bauen);
    expect(j.hinweise).toContain('needs: bauen');
    expect(j.hinweise).toContain('VORGABE: ${{ inputs.hinweis }}');
    expect(j.hinweise).toContain('python3 .github/scripts/release-notes.py testflight');
    expect(j.hinweise.match(/BUILD_NUMMER: \$\{\{ needs\.bauen\.outputs\.build-nummer \}\}/g)).toHaveLength(2);
    expect(j.hinweise).toContain("'attributes': {'whatsNew': hinweise}");
  });

  it('testflight.yml bietet keine Backend-Adresse mehr an', () => {
    // Xcode Cloud baut aus dem Repo-Stand; eine Eingabe liefe still ins Leere.
    const wf = lesen('.github/workflows/testflight.yml');
    expect(wf).not.toMatch(/^ {6}backend:/m);
    expect(wf).not.toContain('inputs.backend');
    expect(wf).not.toContain('EXPO_PUBLIC_PB_URL');
  });
});
